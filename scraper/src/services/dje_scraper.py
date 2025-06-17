"""🕷️ Scraper DJE São Paulo"""

import asyncio
import time
import re
import io
from datetime import datetime, date, timedelta
from typing import List, Optional, Dict, Any
from urllib.parse import urljoin, parse_qs, urlparse

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait, Select
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.service import Service
from selenium.common.exceptions import (
   TimeoutException, 
   NoSuchElementException, 
   WebDriverException,
   StaleElementReferenceException
)
from webdriver_manager.chrome import ChromeDriverManager

from bs4 import BeautifulSoup
import structlog
import httpx
import pdfplumber
import pytesseract
from PIL import Image
from decimal import Decimal

import html
from urllib.parse import urlparse, urlunparse

from ..config.settings import settings
from ..models.publication import PublicationData, ScrapingResult
from ..utils.circuit_breaker import CircuitBreaker


logger = structlog.get_logger(__name__)

class DJEScraperError(Exception):
   """🚨 Erro do scraper DJE"""
   pass

class DJEScraper:
   """🕷️ Scraper do Diário da Justiça Eletrônico - COM DEBUG MELHORADO"""
   
   def __init__(self):
       self.driver: Optional[webdriver.Chrome] = None
       self.wait: Optional[WebDriverWait] = None
       self.current_execution_id: Optional[int] = None
       self.base_url = settings.dje_base_url
       self.search_url = settings.dje_search_url
       
       # HTTP client para downloads
       self.http_client = httpx.AsyncClient(
           timeout=httpx.Timeout(settings.pdf_timeout),
           headers={
               'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
           }
       )
       
       # Circuit breaker para proteção
       self.circuit_breaker = CircuitBreaker(
           failure_threshold=3,
           recovery_timeout=30,
           expected_exception=WebDriverException
       )
       
       logger.info("DJE Scraper initialized (PDF STRATEGY - DEBUG MODE)")
   
   async def setup_driver(self):
       """🚗 Configurar driver do Selenium usando Selenium Manager nativo"""
       try:
           options = settings.get_browser_options()
       
           logger.info("Starting Chrome browser with Selenium Manager", headless=settings.headless_browser)
       
           # Selenium Manager automaticamente baixa e configura o ChromeDriver
           self.driver = webdriver.Chrome(options=options)
           self.driver.implicitly_wait(settings.implicit_wait)
           self.driver.set_page_load_timeout(settings.browser_timeout)
           self.wait = WebDriverWait(self.driver, settings.browser_timeout)
       
           logger.info("Chrome driver setup completed successfully")
       
       except Exception as e:
           logger.error("Failed to setup Chrome driver", error=str(e))
           raise DJEScraperError(f"Driver setup failed: {str(e)}")
   
   async def navigate_to_search_page(self) -> bool:
       """🌐 Navegar para página de busca avançada"""
       try:
           with self.circuit_breaker:
               logger.info("Navigating to DJE advanced search", url=self.search_url)
               
               self.driver.get(self.search_url)
               
               # Wait for form to load
               self.wait.until(
                   EC.presence_of_element_located((By.NAME, "consultaAvancadaForm"))
               )
               
               logger.info("Successfully navigated to DJE search page")
               return True
               
       except Exception as e:
           logger.error("Failed to navigate to search page", error=str(e))
           return False
   
   async def configure_search_parameters(self, target_date: date) -> bool:
       """⚙️ Configurar parâmetros de busca CORRIGIDOS"""
       try:
           logger.info(
               "Configuring search parameters",
               target_date=target_date.isoformat(),
               search_terms=settings.search_terms,
               target_caderno=settings.target_caderno
           )
           
           # 1. Configurar datas
           date_str = target_date.strftime("%d/%m/%Y")
           
           # Data início
           dt_inicio = self.wait.until(
               EC.presence_of_element_located((By.NAME, "dadosConsulta.dtInicio"))
           )
           self.driver.execute_script("arguments[0].removeAttribute('readonly')", dt_inicio)
           dt_inicio.clear()
           dt_inicio.send_keys(date_str)
           
           # Data fim (mesmo dia)
           dt_fim = self.driver.find_element(By.NAME, "dadosConsulta.dtFim")
           self.driver.execute_script("arguments[0].removeAttribute('readonly')", dt_fim)
           dt_fim.clear()
           dt_fim.send_keys(date_str)
           
           await asyncio.sleep(1)
           
           # 2. Selecionar Caderno CORRETO (value="12" = Caderno 3 - Parte I)
           caderno_select = Select(
               self.driver.find_element(By.NAME, "dadosConsulta.cdCaderno")
           )
           caderno_select.select_by_value(settings.target_caderno)  # "12"
           
           await asyncio.sleep(1)
           
           # 3. Configurar palavras-chave ESPECÍFICAS
           palavras_input = self.driver.find_element(By.NAME, "dadosConsulta.pesquisaLivre")
           palavras_input.clear()
           palavras_input.send_keys(settings.search_terms)  # "RPV" E "pagamento pelo INSS"
           
           logger.info(
               "Search parameters configured successfully",
               date=date_str,
               caderno=settings.target_caderno,
               search_query=settings.search_terms
           )
           
           return True
           
       except Exception as e:
           logger.error("Failed to configure search parameters", error=str(e))
           return False
   
   async def execute_search(self) -> bool:
       """🔍 Executar busca"""
       try:
           logger.info("Executing search")
           
           # Encontrar e clicar no botão "Pesquisar"
           search_button = self.wait.until(
               EC.element_to_be_clickable((By.XPATH, "//input[@type='submit'][@value='Pesquisar']"))
           )
           
           search_button.click()
           
           # Aguardar resultados carregarem
           try:
               # Wait for results container or error message
               self.wait.until(
                   EC.any_of(
                       EC.presence_of_element_located((By.ID, "divResultadosInferior")),
                       EC.presence_of_element_located((By.CLASS_NAME, "erro")),
                       EC.text_to_be_present_in_element((By.TAG_NAME, "body"), "Nenhum resultado")
                   )
               )
               
               logger.info("Search executed successfully")
               return True
               
           except TimeoutException:
               logger.warning("Search results took too long to load")
               return False
               
       except Exception as e:
           logger.error("Failed to execute search", error=str(e))
           return False
   
   async def extract_publications_from_results(self) -> List[PublicationData]:
       """📄 Extrair publicações dos PDFs individuais - COM DEBUG MELHORADO"""
       publications = []
       
       try:
           # 1. Obter links dos PDFs da página de resultados
           pdf_links = await self._extract_pdf_links_from_search_results()
           
           logger.info(f"Found {len(pdf_links)} PDF links to process")
           
           # 2. Processar cada PDF individualmente
           for i, pdf_url in enumerate(pdf_links, 1):
               try:
                   logger.info(f"Processing PDF {i}/{len(pdf_links)}: {pdf_url}")
                   
                   # Baixar PDF
                   pdf_content = await self._download_pdf(pdf_url)
                   if not pdf_content:
                       continue
                   
                   # Extrair texto do PDF
                   pdf_text = await self._extract_text_from_pdf(pdf_content)
                   if not pdf_text:
                       continue
                   
                                    
                   # REMOVER validação no nível do PDF - processar sempre
                   logger.info(f"PDF {i}: Processando seções independente da validação geral")
                   
                   # Extrair publicações do texto (pode ter múltiplas)
                   page_publications = await self._extract_publications_from_text(pdf_text, pdf_url)
                   
                   for pub in page_publications:
                       if pub:
                           publications.append(pub)
                           logger.info(f"Publicação extraída: {pub.process_number}")
                   
                   # Rate limiting
                   await asyncio.sleep(settings.dje_delay_between_requests)
                   
               except Exception as e:
                   logger.warning(f"Erro ao processar PDF {i}: {e}")
                   continue
           
           logger.info(f"Total de publicações válidas extraídas: {len(publications)}")
           
       except Exception as e:
           logger.error(f"Erro na extração geral: {e}")
       
       return publications
   
   async def _debug_extracted_text(self, text: str, pdf_index: int):
       """🚀 DEBUG: Log detalhado do texto extraído"""
       try:
           text_preview = text[:1000] if text else "TEXTO VAZIO"
           text_length = len(text) if text else 0
           
           logger.info(
               f"🔍 DEBUG PDF {pdf_index} - Texto extraído",
               text_length=text_length,
               text_preview=text_preview,
               has_rpv_term=bool(re.search(r'\bRPV\b', text, re.IGNORECASE)) if text else False,
               has_inss_payment=bool(re.search(r'pagamento pelo INSS', text, re.IGNORECASE)) if text else False,
               encoding_info=type(text).__name__
           )
           
           # Salvar texto completo em arquivo para debug (opcional)
           if settings.debug_save_extracted_text:
               with open(f"debug_pdf_{pdf_index}_text.txt", "w", encoding="utf-8") as f:
                   f.write(text)
               logger.debug(f"Texto completo salvo em debug_pdf_{pdf_index}_text.txt")
               
       except Exception as e:
           logger.error(f"Erro no debug do texto extraído: {e}")
   
   async def _extract_pdf_links_from_search_results(self) -> List[str]:
       """🔗 Extrair URLs dos PDFs da página de resultados"""
       import html
       from urllib.parse import urljoin, urlparse, urlunparse
       
       links = []

       try:
           # Verificar se há resultados
           try:
               self.driver.find_element(By.ID, "divResultadosInferior")
           except NoSuchElementException:
               logger.info("Nenhum container de resultados encontrado")
               return []

           page_source = self.driver.page_source
           soup = BeautifulSoup(page_source, 'html.parser')

           # Procurar links com popup() - padrão do DJE
           popup_links = soup.find_all('a', onclick=re.compile(r"popup\('(/cdje/consultaSimples\.do\?[^']+)'\)"))

           for link in popup_links:
               onclick = link.get('onclick', '')
               match = re.search(r"popup\('(/cdje/consultaSimples\.do\?[^']+)'\)", onclick)
               if match:
                   relative_url = match.group(1)
                   # Normalizar URL diretamente aqui
                   unescaped = html.unescape(relative_url)
                   parsed = urlparse(unescaped)
                   normalized_url = urlunparse(parsed)
                   full_url = urljoin(self.base_url, normalized_url)
                   links.append(full_url)

           # Remover duplicatas mantendo ordem
           unique_links = []
           for link in links:
               if link not in unique_links:
                   unique_links.append(link)

           logger.info(f"Extracted {len(unique_links)} unique PDF links")
           return unique_links

       except Exception as e:
           logger.error(f"Erro ao extrair links dos PDFs: {e}")
           return []
  
   async def _download_pdf(self, pdf_url: str) -> Optional[bytes]:
       """📥 Baixar PDF individual"""
       try:
           # Construir URL direta do PDF baseada na URL de consulta
           if "consultaSimples.do" in pdf_url:
               # Extrair parâmetros da URL de consulta
               from urllib.parse import urlparse, parse_qs
               parsed = urlparse(pdf_url)
               params = parse_qs(parsed.query)
               
               # Construir URL direta do PDF
               pdf_direct_url = f"https://dje.tjsp.jus.br/cdje/getPaginaDoDiario.do?cdVolume={params['cdVolume'][0]}&nuDiario={params['nuDiario'][0]}&cdCaderno={params['cdCaderno'][0]}&nuSeqpagina={params['nuSeqpagina'][0]}&uuidCaptcha="
               
               logger.debug(f"Converted to direct PDF URL: {pdf_direct_url}")
               pdf_url = pdf_direct_url
           
           response = await self.http_client.get(pdf_url)
           response.raise_for_status()
           
           # Verificar tamanho do arquivo
           content_length = len(response.content)
           max_size = settings.pdf_max_size_mb * 1024 * 1024
           
           if content_length > max_size:
               logger.warning(f"PDF muito grande ({content_length / 1024 / 1024:.1f}MB), pulando")
               return None
           
           # Verificar se é PDF
           content_type = response.headers.get('content-type', '').lower()
           if 'pdf' in content_type or content_length > 1000:  # PDFs são geralmente maiores que 1KB
               return response.content
           
           logger.warning(f"Response não é PDF: content-type={content_type}, size={content_length}")
           return None
           
       except Exception as e:
           logger.error(f"Erro ao baixar PDF {pdf_url}: {e}")
           return None
  
   async def _extract_text_from_pdf(self, pdf_content: bytes) -> Optional[str]:
       """📄 Extrair texto do PDF com fallback OCR - COM DEBUG"""
       try:
           # Tentar extrair como PDF texto primeiro
           try:
               with pdfplumber.open(io.BytesIO(pdf_content)) as pdf:
                   text = ""
                   for page_num, page in enumerate(pdf.pages):
                       page_text = page.extract_text()
                       if page_text:
                           text += page_text + "\n"
                   
                   if text and len(text.strip()) > 100:
                       return text
                       
           except Exception as e:
               logger.debug(f"PDF text extraction failed: {e}, trying OCR")
           
           # Fallback: OCR se o texto for insuficiente
           try:
               logger.debug("Attempting OCR extraction...")
               with pdfplumber.open(io.BytesIO(pdf_content)) as pdf:
                   text = ""
                   for page_num, page in enumerate(pdf.pages):
                       try:
                           # Converter página em imagem
                           img = page.to_image(resolution=300)
                           
                           # Aplicar OCR
                           page_text = pytesseract.image_to_string(
                               img.original, 
                               lang=settings.ocr_language,
                               config=settings.ocr_config
                           )
                           text += page_text + "\n"
                           logger.debug(f"OCR page {page_num}: {len(page_text)} chars")
                           
                       except Exception as e:
                           logger.warning(f"OCR failed for page {page_num}: {e}")
                           continue
                   
                   logger.debug(f"🔍 OCR extraction: {len(text)} total chars extracted")
                   
                   if text and len(text.strip()) > 50:
                       logger.debug("OCR text extracted successfully")
                       return text
                   else:
                       logger.warning(f"OCR text too short: {len(text.strip())} chars")
                       
           except Exception as e:
               logger.warning(f"OCR extraction failed: {e}")
           
           return None
           
       except Exception as e:
           logger.error(f"Erro na extração de texto do PDF: {e}")
           return None
  
   def _validate_required_keywords(self, text: str) -> bool:
       """✅ Validar palavras-chave obrigatórias: RPV + pagamento pelo INSS - COM DEBUG"""
       try:
           if not text:
               return False
               
           has_rpv = bool(re.search(r'\bRPV\b', text, re.IGNORECASE))
           has_inss_payment = bool(re.search(r'pagamento pelo INSS', text, re.IGNORECASE))
           
           return has_rpv and has_inss_payment
           
       except Exception as e:
           logger.error(f"Erro na validação de palavras-chave: {e}")
           return False
  
   async def _extract_publications_from_text(self, text: str, source_url: str) -> List[PublicationData]:
        """📋 Extrair múltiplas publicações do texto"""
        publications = []
        
        # ✅ EXTRAIR DATA UMA VEZ DO CABEÇALHO COMPLETO
        publication_date = self._extract_publication_date_from_header(text)
        
        try:
            # Separar por processos individuais
            process_sections = re.split(r'(?=Processo \d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4})', text)
            
            for i, section in enumerate(process_sections):
                if not section.strip():
                    continue
                
                if not self._validate_required_keywords(section):
                    continue
            
                publication = await self._extract_single_publication_from_text(
                    section, source_url, publication_date
                )
                if publication:
                    publications.append(publication)
            
            return publications
        except Exception as e:
            logger.error(f"Erro ao extrair publicações do texto: {e}")
            return []
  
   def _extract_publication_date_from_header(self, full_text: str) -> Optional[date]:
        """📅 Extrair data de disponibilização do cabeçalho do DJE"""
        months = {
            'janeiro': 1, 'fevereiro': 2, 'março': 3, 'abril': 4,
            'maio': 5, 'junho': 6, 'julho': 7, 'agosto': 8,
            'setembro': 9, 'outubro': 10, 'novembro': 11, 'dezembro': 12
        }
         
        pattern = r'Disponibilização:\s*([^,]+),\s*(\d{1,2})\s+de\s+([a-záêçõãàéíóúâîôû]+)\s+de\s+(\d{4})'
        match = re.search(pattern, full_text, re.IGNORECASE)
        
        if match:
            try:
                day_of_week = match.group(1).strip()
                day = int(match.group(2))
                month_name = match.group(3)
                year = int(match.group(4))
                
                logger.debug(f"🗓️ Dados extraídos: dia_semana='{day_of_week}', dia={day}, mês='{month_name}', ano={year}")
                
                if month_name in months:
                    publication_date = date(year, months[month_name], day)
                    logger.debug(f"✅ Data extraída do cabeçalho: {publication_date}")
                    return publication_date
                else:
                    logger.warning(f"❌ Mês '{month_name}' não encontrado no dicionário")
                    
            except (ValueError, KeyError) as e:
                logger.warning(f"Erro ao converter data: {e}")
        
        logger.debug("❌ Não foi possível extrair data do cabeçalho")
        return None


   def extract_authors_improved(text):
        """Extrair autores com padrões melhorados para DJE"""
        authors = []
        
        # 🎯 PADRÕES ESPECÍFICOS PARA DJE (mais eficazes primeiro)
        author_patterns = [
            
            # 1. PADRÃO PRINCIPAL - DIREITO PREVIDENCIÁRIO
            # "- DIREITO PREVIDENCIÁRIO - [NOME] - Vistos"
            r'-\s*DIREITO PREVIDENCIÁRIO\s*-\s*([A-ZÁÊÇÕÃÀÉÍÓÚÂÎÔÛ][a-záêçõãàéíóúâîôûç\s]+?)\s*-\s*Vistos',
            
            # 2. PADRÃO PARA DIFERENTES TIPOS DE BENEFÍCIO
            # "- [TIPO BENEFÍCIO] - [NOME] - Vistos"
            r'-\s*(?:Auxílio-Acidente|Auxílio-Doença|Aposentadoria|Benefícios em Espécie|Incapacidade Laborativa)\s*(?:\([^)]+\))?\s*-\s*([A-ZÁÊÇÕÃÀÉÍÓÚÂÎÔÛ][a-záêçõãàéíóúâîôûç\s]+?)\s*-\s*Vistos',
            
            # 3. PADRÃO GENÉRICO PARA CUMPRIMENTO DE SENTENÇA
            # "- Cumprimento [qualquer coisa] - [NOME] - Vistos"
            r'-\s*Cumprimento\s+[^-]+\s*-\s*([A-ZÁÊÇÕÃÀÉÍÓÚÂÎÔÛ][a-záêçõãàéíóúâîôûç\s]+?)\s*-\s*Vistos',
            
            # 4. PADRÃO MAIS GENÉRICO - qualquer coisa antes do nome
            # "- [qualquer texto] - [NOME] - Vistos"
            r'-\s*[^-]+\s*-\s*([A-ZÁÊÇÕÃÀÉÍÓÚÂÎÔÛ][a-záêçõãàéíóúâîôûç\s]{8,50}?)\s*-\s*Vistos',
            
            # 5. PADRÃO DE FALLBACK - nome diretamente antes de "Vistos"
            # "[NOME] - Vistos"
            r'([A-ZÁÊÇÕÃÀÉÍÓÚÂÎÔÛ][a-záêçõãàéíóúâîôûç\s]{8,50}?)\s*-\s*Vistos',
            
            # 6. PADRÃO ALTERNATIVO - buscar após processo principal
            # "(processo principal [número]) - [tipo] - [NOME] - Vistos"
            r'\(processo principal [^)]+\)\s*-[^-]*-\s*([A-ZÁÊÇÕÃÀÉÍÓÚÂÎÔÛ][a-záêçõãàéíóúâîôûç\s]+?)\s*-\s*Vistos'
        ]
        
        for i, pattern in enumerate(author_patterns):
            print(f"🔍 Testando padrão {i+1}: {pattern}")
            
            matches = re.findall(pattern, text, re.IGNORECASE | re.MULTILINE)
            print(f"   Matches encontrados: {matches}")
            
            for match in matches:
                if isinstance(match, tuple):
                    author_name = match[-1].strip()
                else:
                    author_name = match.strip()
                
                # Validar nome
                if validate_author_name(author_name):
                    author_name = clean_author_name(author_name)
                    if author_name not in authors:
                        authors.append(author_name)
                        print(f"✅ Autor extraído: {author_name}")
                        return authors  # Retorna assim que encontra o primeiro
        
        print("❌ Nenhum autor encontrado")
        return authors

   def validate_author_name(name):
        """Validar se o nome extraído é válido"""
        if not name or len(name.strip()) < 5:
            return False
        
        # Rejeitar se contém apenas palavras comuns de documentos jurídicos
        invalid_words = [
            'vistos', 'tendo', 'processo', 'cumprimento', 'sentença', 
            'direito', 'previdenciário', 'art', 'homologação'
        ]
        
        name_lower = name.lower()
        if any(word in name_lower for word in invalid_words):
            return False
        
        # Deve ter pelo menos 2 palavras (nome e sobrenome)
        words = name.split()
        if len(words) < 2:
            return False
        
        return True

   def clean_author_name(name):
        """Limpar e formatar nome do autor"""
        # Remover caracteres especiais no início/fim
        name = re.sub(r'^[^\w\s]+|[^\w\s]+$', '', name)
        
        # Normalizar espaços
        name = re.sub(r'\s+', ' ', name.strip())
        
        # Capitalizar cada palavra
        return ' '.join(word.capitalize() for word in name.split())


    
   async def _extract_single_publication_from_text(self, text: str, source_url: str, publication_date: Optional[date] = None) -> Optional[PublicationData]:
        """📋 Extrair dados de uma única publicação do texto - VERSÃO CORRIGIDA AUTORES"""
        try:
            # Extrair número do processo
            process_match = re.search(r'Processo (\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4})', text)
            if not process_match:
                logger.debug("❌ Número do processo não encontrado")
                return None
            
            process_number = process_match.group(1)
            logger.debug(f"✅ Processo encontrado: {process_number}")
            
            # ✅ EXTRAÇÃO DE AUTORES CORRIGIDA - PADRÃO REAL DO DJE
            authors = []
            
            # PADRÃO PRINCIPAL: - [NOME] - Vistos
            # Baseado nos exemplos reais: "- Josuel Anderson de Oliveira - Vistos"
            author_pattern = r'-\s*([A-ZÁÊÇÕÃÀÉÍÓÚÂÎÔÛ][a-záêçõãàéíóúâîôûç]+(?:\s+[A-ZÁÊÇÕÃÀÉÍÓÚÂÎÔÛ][a-záêçõãàéíóúâîôûç]+)+)\s*-\s*Vistos\.?'
            
            matches = re.findall(author_pattern, text, re.IGNORECASE | re.MULTILINE)
            logger.debug(f"🔍 Testando padrão principal de autores: {author_pattern}")
            logger.debug(f"🔍 Matches encontrados: {matches}")
            
            for match in matches:
                author_name = match.strip()
                # Validação básica do nome
                if len(author_name) >= 5 and len(author_name.split()) >= 2:
                    # Limpar e formatar nome
                    author_name = re.sub(r'\s+', ' ', author_name.strip())
                    author_name = ' '.join(word.capitalize() for word in author_name.split())
                    
                    if author_name not in authors:
                        authors.append(author_name)
                        logger.debug(f"✅ Autor extraído: {author_name}")
            
            # FALLBACK: Se não encontrou com o padrão principal, tentar outros padrões
            if not authors:
                logger.debug("❌ Nenhum autor encontrado com padrão principal, tentando fallback...")
                
                # Padrão fallback mais amplo
                fallback_patterns = [
                    # 1. Casos como "DIREITO PREVIDENCIÁRIO - Nome - Vistos"
                    r'DIREITO PREVIDENCIÁRIO\s*-\s*([A-ZÁÂÃÉÊÍÓÔÕÚÇ][a-záâãéêíóôõúç]+(?:\s+[A-ZÁÂÃÉÊÍÓÔÕÚÇ][a-záâãéêíóôõúç]+)+)\s*-\s*Vistos[.:]?',
                    
                    # 2. Casos com tipo de benefício antes do nome
                    r'(?:Auxílio-Acidente|Auxílio-Doença|Aposentadoria|Benefícios em Espécie|Incapacidade Laborativa)[^-]*-\s*([A-ZÁÂÃÉÊÍÓÔÕÚÇ][a-záâãéêíóôõúç]+(?:\s+[A-ZÁÂÃÉÊÍÓÔÕÚÇ][a-záâãéêíóôõúç]+)+)\s*-\s*Vistos[.:]?',
                    
                    # 3. Padrão genérico: nome composto antes de "- Vistos"
                    r'-\s*([A-ZÁÂÃÉÊÍÓÔÕÚÇ][a-záâãéêíóôõúç]+(?:\s+[A-ZÁÂÃÉÊÍÓÔÕÚÇ][a-záâãéêíóôõúç]+)+)\s*-\s*Vistos[.:]?'
                ]
                                
                for i, pattern in enumerate(fallback_patterns):
                    matches = re.findall(pattern, text, re.IGNORECASE)
                    logger.debug(f"🔍 Fallback pattern {i+1}: {len(matches)} matches")
                    
                    for match in matches:
                        author_name = match.strip()
                        if len(author_name) >= 5 and len(author_name.split()) >= 2:
                            author_name = re.sub(r'\s+', ' ', author_name.strip())
                            author_name = ' '.join(word.capitalize() for word in author_name.split())
                            
                            if author_name not in authors:
                                authors.append(author_name)
                                logger.debug(f"✅ Autor extraído com fallback {i+1}: {author_name}")
                                break
                    
                    if authors:  # Se encontrou, para aqui
                        break
            
            if not authors:
                logger.debug("❌ Nenhum autor encontrado mesmo com fallback")
            
            # Extrair advogado (mantendo o código existente)
            lawyers = []
            lawyer_patterns = [
                r'ADV: ([A-ZÁÊÇÕ\s]+?) \(OAB (\d+\/SP)\)',
                r'Int\. - ADV: ([A-ZÁÊÇÕ\s]+?) \(OAB (\d+\/SP)\)'
            ]
            
            for pattern in lawyer_patterns:
                matches = re.findall(pattern, text)
                for match in matches:
                    lawyer_name = match[0].strip()
                    oab_number = match[1]
                    lawyers.append(f"{lawyer_name} (OAB {oab_number})")
                    logger.debug(f"✅ Advogado encontrado: {lawyer_name} (OAB {oab_number})")
            
            # Extrair valores monetários (mantendo o código que já está funcionando)
            main_value = None
            interest_value = None
            legal_fees = None
            
            # Valor principal
            main_patterns = [
                r'R\$ ([\d.,]+) - principal\s*bruto\/?\s*líquido?',
                r'R\$ ([\d.,]+) - principal',
                r'valor.*?principal.*?R\$ ([\d.,]+)',
                r'importe total de R\$ ([\d.,]+)'
            ]
            
            for pattern in main_patterns:
                match = re.search(pattern, text, re.IGNORECASE)
                if match:
                    main_value = self._parse_monetary_value(match.group(1))
                    logger.debug(f"✅ Valor principal: {main_value}")
                    break
            
            # Juros moratórios
            if re.search(r'sem juros moratórios', text, re.IGNORECASE):
                interest_value = Decimal('0.00')
                logger.debug("✅ Sem juros moratórios")
            else:
                interest_patterns = [
                    r'R\$ ([\d.,]+) - juros moratórios',
                    r'juros.*?R\$ ([\d.,]+)',
                    r'correção.*?R\$ ([\d.,]+)'
                ]
                
                for pattern in interest_patterns:
                    match = re.search(pattern, text, re.IGNORECASE)
                    if match:
                        interest_value = self._parse_monetary_value(match.group(1))
                        logger.debug(f"✅ Juros moratórios: {interest_value}")
                        break
            
            # Honorários advocatícios
            fees_patterns = [
                r'R\$ ([\d.,]+) - honorários advocatícios',
                r'honorários.*?R\$ ([\d.,]+)',
                r'verba.*?honorária.*?R\$ ([\d.,]+)'
            ]
            
            for pattern in fees_patterns:
                match = re.search(pattern, text, re.IGNORECASE)
                if match:
                    legal_fees = self._parse_monetary_value(match.group(1))
                    logger.debug(f"✅ Honorários: {legal_fees}")
                    break
            
            publication = PublicationData(
                process_number=process_number,
                authors=authors,
                lawyers=lawyers,
                full_content=text,
                source_url=source_url,
                publication_date=publication_date,
                availability_date=publication_date,
                main_value=main_value,
                interest_value=interest_value,
                legal_fees=legal_fees,
                scraper_execution_id=self.current_execution_id
            )
            
            logger.debug(f"📊 Publicação criada: {process_number}, autores: {len(authors)} ({authors}), válida: {publication.is_valid()}")
            return publication
            
        except Exception as e:
            logger.error(f"Erro ao extrair dados da publicação: {e}")
            return None
  
   def _parse_monetary_value(self, value_str: str) -> Optional[Decimal]:
       """💰 Converter string monetária brasileira para Decimal - COM DEBUG"""
       if not value_str or value_str.strip() in ['.', ',', '-', '']:
           logger.debug(f"🚀 DEBUG: Valor monetário inválido/vazio: '{value_str}'")
           return None
       
       try:
           # Limpar string
           clean_value = value_str.strip()
           logger.debug(f"🚀 DEBUG: Parsing valor: '{value_str}' -> '{clean_value}'")
           
          # Formato brasileiro: 1.234,56
           if ',' in clean_value and clean_value.count('.') > 0:
               # Remove separadores de milhar e converte vírgula para ponto
               clean_value = clean_value.replace('.', '').replace(',', '.')
           elif ',' in clean_value:
               # Apenas vírgula, converter para ponto
               clean_value = clean_value.replace(',', '.')
           
           # Verificar se sobrou algo válido
           if not clean_value or clean_value in ['.', ',']:
               logger.debug(f"🚀 DEBUG: Valor limpo inválido: '{clean_value}'")
               return None
           
           result = Decimal(clean_value)
           logger.debug(f"🚀 DEBUG: Conversão bem-sucedida: '{value_str}' -> {result}")
           return result
               
       except (ValueError, AttributeError, Exception) as e:
           logger.debug(f"🚀 DEBUG: Erro ao converter valor '{value_str}': {e}")
           return None
   
   async def navigate_to_next_page(self) -> bool:
      """➡️ Navegar para próxima página usando JavaScript"""
      try:
          # Procurar link "Próximo>"
          next_links = self.driver.find_elements(
              By.XPATH, 
              "//a[contains(text(), 'Próximo>') or contains(text(), 'Próximo')]"
          )
          
          for link in next_links:
              if link.is_enabled() and link.is_displayed():
                  onclick = link.get_attribute('onclick')
                  if onclick and 'trocaDePg' in onclick:
                      # Extrair número da página
                      page_match = re.search(r'trocaDePg\((\d+)\)', onclick)
                      if page_match:
                          next_page = page_match.group(1)
                          logger.debug(f"Navigating to page {next_page}")
                          
                          # Executar JavaScript diretamente
                          self.driver.execute_script(f"trocaDePg({next_page});")
                          
                          # Aguardar nova página carregar
                          await asyncio.sleep(3)
                          
                          # Verificar se mudou de página
                          try:
                              self.wait.until(
                                  EC.presence_of_element_located((By.ID, "divResultadosInferior"))
                              )
                              logger.info(f"Successfully navigated to page {next_page}")
                              return True
                          except TimeoutException:
                              logger.warning("Next page did not load properly")
                              return False
          
          logger.info("No next page link found or enabled")
          return False
          
      except Exception as e:
          logger.warning("Failed to navigate to next page", error=str(e))
          return False
  
   async def scrape_publications(
      self, 
      target_date: date,
      execution_id: int
  ) -> ScrapingResult:
      """🕷️ Método principal de scraping com DEBUG MELHORADO"""
      
      self.current_execution_id = execution_id
      result = ScrapingResult()
      start_time = time.time()
      
      try:
          logger.info(
              "Starting DJE scraping (PDF STRATEGY - DEBUG MODE)",
              target_date=target_date.isoformat(),
              execution_id=execution_id
          )
          
          # Setup driver se necessário
          if not self.driver:
              await self.setup_driver()
          
          # 1. Navegar para página de busca
          if not await self.navigate_to_search_page():
              raise DJEScraperError("Failed to navigate to search page")
          
          # 2. Configurar parâmetros de busca
          if not await self.configure_search_parameters(target_date):
              raise DJEScraperError("Failed to configure search parameters")
          
          # 3. Executar busca
          if not await self.execute_search():
              raise DJEScraperError("Failed to execute search")
          
          # 4. Processar resultados página por página
          current_page = 1
          max_pages = settings.max_pages_per_execution
          
          while current_page <= max_pages:
              logger.info(f"Processing page {current_page}")
              
              # Extrair publicações da página atual (estratégia PDF com DEBUG)
              page_publications = await self.extract_publications_from_results()
              
              result.total_found += len(page_publications)
              result.pages_scraped = current_page
              
              # Adicionar publicações válidas ao resultado
              valid_count = 0
              for publication in page_publications:
                  if publication and publication.is_valid():
                      result.add_publication(publication)
                      valid_count += 1
                      logger.info(f"✅ Publicação válida adicionada: {publication.process_number}")
                  else:
                      if publication:
                          result.add_error(f"Publicação inválida: {publication.process_number}")
                          logger.warning(f"❌ Publicação inválida: {publication.process_number}")
                      else:
                          result.add_error("Falha na extração de publicação")
              
              logger.info(
                  f"📊 Page {current_page} processed",
                  publications_found=len(page_publications),
                  valid_publications=valid_count
              )
              
              # Tentar ir para próxima página
              if current_page < max_pages:
                  if await self.navigate_to_next_page():
                      current_page += 1
                      # Delay entre páginas
                      await asyncio.sleep(settings.dje_delay_between_requests)
                  else:
                      logger.info("No more pages available")
                      break
              else:
                  logger.info(f"Reached maximum pages limit ({max_pages})")
                  break
          
          result.execution_time = time.time() - start_time
          
          logger.info(
              "DJE scraping completed successfully",
              execution_id=execution_id,
              **result.get_summary()
          )
          
      except Exception as e:
          result.add_error(f"Scraping failed: {str(e)}")
          result.execution_time = time.time() - start_time
          
          logger.error(
              "DJE scraping failed",
              execution_id=execution_id,
              error=str(e),
              execution_time=result.execution_time
          )
          
          raise
      
      return result
  
   async def close(self):
      """🔒 Fechar driver e recursos"""
      if self.http_client:
          await self.http_client.aclose()
      
      if self.driver:
          try:
              self.driver.quit()
              logger.info("Chrome driver closed successfully")
          except Exception as e:
              logger.warning("Error closing driver", error=str(e))
          finally:
              self.driver = None
              self.wait = None

   def normalize_link(url: str) -> str:
      """🔗 Normalizar URL removendo entidades HTML"""
      import html
      from urllib.parse import urlparse, urlunparse
   
      # Desescapa entidades HTML como &amp;
      unescaped = html.unescape(url)
      parsed = urlparse(unescaped)
      # Normaliza a URL (sem ordenar query, só padroniza)
      return urlunparse(parsed)

# Singleton instance
_scraper: Optional[DJEScraper] = None

async def get_dje_scraper() -> DJEScraper:
  """🕷️ Get singleton DJE scraper instance"""
  global _scraper
  
  if _scraper is None:
      _scraper = DJEScraper()
  
  return _scraper

async def close_dje_scraper():
  """🔒 Close singleton DJE scraper"""
  global _scraper
  
  if _scraper:
      await _scraper.close()
      _scraper = None