"""📄 Modelos de dados para Publicações e Execuções"""

import re
from datetime import datetime, date
from typing import Optional, List, Dict, Any
from dataclasses import dataclass, field
from decimal import Decimal, InvalidOperation
import structlog

logger = structlog.get_logger(__name__)

@dataclass
class PublicationData:
    """📄 Dados de uma publicação do DJE"""
    
    process_number: str
    authors: List[str] = field(default_factory=list)
    lawyers: List[str] = field(default_factory=list)
    full_content: Optional[str] = None
    source_url: Optional[str] = None
    publication_date: Optional[date] = None
    availability_date: Optional[date] = None
    main_value: Optional[Decimal] = None
    interest_value: Optional[Decimal] = None
    legal_fees: Optional[Decimal] = None
    scraper_execution_id: Optional[int] = None
    
    def __post_init__(self):
        """🔧 Validações e limpeza após inicialização"""
        # Clean process number
        self.process_number = self._clean_process_number(self.process_number)
        
        # Clean authors and lawyers
        self.authors = [self._clean_name(author) for author in self.authors if author]
        self.lawyers = [self._clean_lawyer_name(lawyer) for lawyer in self.lawyers if lawyer]
        
        # Extract monetary values from content if not provided
        if self.full_content and not all([self.main_value, self.interest_value, self.legal_fees]):
            extracted_values = self._extract_monetary_values(self.full_content)
            
            if self.main_value is None:
                self.main_value = extracted_values.get('main_value')
            if self.interest_value is None:
                self.interest_value = extracted_values.get('interest_value')
            if self.legal_fees is None:
                self.legal_fees = extracted_values.get('legal_fees')
    
    @staticmethod
    def _clean_process_number(process_number: str) -> str:
        """🧹 Limpar número do processo"""
        if not process_number:
            raise ValueError("Process number cannot be empty")
        
        # Remove extra spaces and normalize
        cleaned = re.sub(r'\s+', '', process_number.strip())
        
        # Validate format (basic check)
        if not re.match(r'^\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}$', cleaned):
            logger.warning(
                "Process number format may be invalid",
                process_number=cleaned
            )
        
        return cleaned
 
    
    def _parse_monetary_value_improved(value_str: str, value_type: str = "") -> Optional[Decimal]:
        """💰 Converter string monetária brasileira para Decimal - VERSÃO MELHORADA"""
        
        if not value_str:
            return None
        
        # Limpar string
        clean_value = value_str.strip()
        
        # Log detalhado do parsing
        logger.debug(
            f"🚀 DEBUG: Parsing valor {value_type}",
            original=value_str,
            cleaned=clean_value
        )
        
        # Rejeitar valores claramente inválidos
        invalid_values = ['.', ',', '-', '', 'R$', '$']
        if clean_value in invalid_values or len(clean_value) < 2:
            logger.debug(
                f"❌ Valor rejeitado - muito curto ou inválido",
                value=clean_value,
                type=value_type
            )
            return None
        
        # Remover caracteres não numéricos exceto pontos e vírgulas
        # Manter apenas dígitos, pontos e vírgulas
        clean_value = re.sub(r'[^\d.,]', '', clean_value)
        
        if not clean_value or clean_value in invalid_values:
            logger.debug(f"❌ Valor inválido após limpeza: '{clean_value}'")
            return None
        
        try:
            # Formato brasileiro: 1.234,56 ou americano: 1,234.56
            if ',' in clean_value and clean_value.count('.') > 0:
                # Assumir formato brasileiro: separadores de milhar (.) e decimal (,)
                if clean_value.rfind(',') > clean_value.rfind('.'):
                    # Formato brasileiro: 1.234,56
                    clean_value = clean_value.replace('.', '').replace(',', '.')
                else:
                    # Formato americano: 1,234.56
                    clean_value = clean_value.replace(',', '')
            elif ',' in clean_value:
                # Apenas vírgula - assumir decimal brasileiro
                clean_value = clean_value.replace(',', '.')
            
            # Verificar se sobrou algo válido
            if not clean_value or clean_value in ['.', ',']:
                logger.debug(f"❌ Valor inválido após conversão: '{clean_value}'")
                return None
            
            # Verificar se é um número válido
            if not re.match(r'^\d+\.?\d*$', clean_value):
                logger.debug(f"❌ Formato numérico inválido: '{clean_value}'")
                return None
            
            result = Decimal(clean_value)
            
            # Verificar se o valor é razoável (não muito pequeno)
            if result < Decimal('0.01'):
                logger.debug(f"❌ Valor muito pequeno: {result}")
                return None
            
            logger.debug(
                f"✅ Conversão bem-sucedida",
                original=value_str,
                final=clean_value,
                result=str(result),
                type=value_type
            )
            return result
            
        except (ValueError, InvalidOperation) as e:
            logger.warning(
                f"❌ Erro ao converter valor {value_type}",
                original=value_str,
                cleaned=clean_value,
                error=str(e)
            )
            return None 
    
    @staticmethod
    def _clean_name(name: str) -> str:
        """🧹 Limpar nome de pessoa"""
        if not name:
            return ""
        
        # Remove extra spaces and normalize
        cleaned = re.sub(r'\s+', ' ', name.strip())
        
        # Capitalize properly
        cleaned = ' '.join(word.capitalize() for word in cleaned.split())
        
        return cleaned
    
    @staticmethod
    def _clean_lawyer_name(lawyer: str) -> str:
        """⚖️ Limpar nome de advogado (inclui OAB)"""
        if not lawyer:
            return ""
        
        # Basic cleaning
        cleaned = re.sub(r'\s+', ' ', lawyer.strip())
        
        # Extract OAB number if present
        oab_match = re.search(r'OAB[/\s]*(\d+)', cleaned, re.IGNORECASE)
        if oab_match:
            # Normalize OAB format
            oab_number = oab_match.group(1)
            name_part = re.sub(r'OAB[/\s]*\d+', '', cleaned, flags=re.IGNORECASE).strip()
            name_part = PublicationData._clean_name(name_part)
            
            cleaned = f"{name_part} (OAB {oab_number})"
        else:
            cleaned = PublicationData._clean_name(cleaned)
        
        return cleaned
    
    @staticmethod
    def _extract_monetary_values(content: str) -> Dict[str, Optional[Decimal]]:
        """💰 Extrair valores monetários do conteúdo - COM DEBUG MELHORADO"""
        values = {
            'main_value': None,
            'interest_value': None,
            'legal_fees': None
        }
        
        if not content:
            return values
        
        try:
            # Patterns melhorados - mais flexíveis
            patterns = {
                'main_value': [
                    # Padrões mais específicos primeiro
                    r'R\$\s*([\d.,]+)\s*-\s*principal\s*bruto',
                    r'R\$\s*([\d.,]+)\s*-\s*principal\s*líquido',
                    r'R\$\s*([\d.,]+)\s*-\s*principal',
                    r'valor\s+principal[:\s]*R?\$?\s*([\d.,]+)',
                    r'principal[:\s]*R?\$?\s*([\d.,]+)',
                    r'valor.*?principal.*?R\$?\s*([\d.,]+)',
                    r'importe total de R\$\s*([\d.,]+)',
                    # Padrão mais genérico
                    r'R\$\s*([\d.,]{4,})',  # Pelo menos 4 dígitos (ex: 1.000)
                ],
                'interest_value': [
                    r'R\$\s*([\d.,]+)\s*-\s*juros\s*moratórios',
                    r'juros\s*moratórios[:\s]*R?\$?\s*([\d.,]+)',
                    r'juros.*?R\$\s*([\d.,]+)',
                    r'correção.*?R\$\s*([\d.,]+)',
                    r'sem\s+juros\s+moratórios',  # Caso especial - sem juros
                ],
                'legal_fees': [
                    r'R\$\s*([\d.,]+)\s*-\s*honorários\s*advocatícios',
                    r'honorários\s*advocatícios[:\s]*R?\$?\s*([\d.,]+)',
                    r'honorários.*?R\$\s*([\d.,]+)',
                    r'verba.*?honorária.*?R\$\s*([\d.,]+)',
                ]
            }
            
            for value_type, pattern_list in patterns.items():
                logger.debug(f"🔍 Buscando {value_type} no texto...")
                
                for i, pattern in enumerate(pattern_list):
                    matches = re.findall(pattern, content, re.IGNORECASE)
                    
                    if matches:
                        logger.info(
                            f"🎯 Pattern {i+1} encontrou matches para {value_type}",
                            pattern=pattern,
                            matches=matches[:3],  # Primeiros 3 matches
                            total_matches=len(matches)
                        )
                        
                        # Pegar o primeiro match válido
                        for match in matches:
                            if isinstance(match, str):
                                # Log do valor bruto encontrado
                                logger.info(
                                    f"💰 Tentando converter valor {value_type}",
                                    raw_value=match,
                                    pattern_used=f"Pattern {i+1}"
                                )
                                
                                converted_value = PublicationData._parse_monetary_value_improved(match, value_type)
                                if converted_value is not None:
                                    values[value_type] = converted_value
                                    logger.info(
                                        f"✅ Valor {value_type} convertido com sucesso",
                                        raw_value=match,
                                        converted_value=str(converted_value)
                                    )
                                    break
                        
                        if values[value_type] is not None:
                            break  # Encontrou valor, sair do loop de patterns
                    
                    # Caso especial: "sem juros moratórios"
                    if value_type == 'interest_value' and 'sem juros moratórios' in pattern.lower():
                        if re.search(pattern, content, re.IGNORECASE):
                            values[value_type] = Decimal('0.00')
                            logger.info("✅ Juros moratórios = 0 (sem juros)")
                            break
            
        except Exception as e:
            logger.error(
                "Erro na extração de valores monetários",
                error=str(e),
                content_length=len(content)
            )
        
        # Log final dos valores extraídos
        logger.info(
            "📊 Resumo da extração de valores",
            main_value=str(values['main_value']) if values['main_value'] else None,
            interest_value=str(values['interest_value']) if values['interest_value'] else None,
            legal_fees=str(values['legal_fees']) if values['legal_fees'] else None
        )
        
        return values
    
    def is_valid(self) -> bool:
        """✅ Verificar se a publicação é válida - COM DEBUG DETALHADO"""
        
        # Log detalhado para debug
        logger.info(
            "🔍 Validando publicação",
            process_number=self.process_number,
            authors_count=len(self.authors) if self.authors else 0,
            authors=self.authors[:3] if self.authors else [],  # Primeiros 3 autores
            content_length=len(self.full_content) if self.full_content else 0,
            content_preview=self.full_content[:200] if self.full_content else None
        )
        
        if not self.process_number:
            logger.warning("❌ Validação falhou: process_number vazio", process_number=self.process_number)
            return False
        
        if not self.authors:
            logger.warning("❌ Validação falhou: lista de authors vazia", 
                        process_number=self.process_number, 
                        authors=self.authors)
            return False
        
        # Reduzir critério de conteúdo mínimo de 50 para 20 caracteres
        min_content_length = 20
        if not self.full_content or len(self.full_content.strip()) < min_content_length:
            logger.warning("❌ Validação falhou: conteúdo insuficiente", 
                        process_number=self.process_number,
                        content_length=len(self.full_content) if self.full_content else 0,
                        min_required=min_content_length)
            return False
        
        logger.info("✅ Publicação válida", process_number=self.process_number)
        return True
    
    def to_dict(self) -> Dict[str, Any]:
        """📦 Converter para dicionário"""
        return {
            'process_number': self.process_number,
            'authors': self.authors,
            'lawyers': self.lawyers,
            'full_content': self.full_content,
            'source_url': self.source_url,
            'publication_date': self.publication_date.isoformat() if self.publication_date else None,
            'availability_date': self.availability_date.isoformat() if self.availability_date else None,
            'main_value': float(self.main_value) if self.main_value else None,
            'interest_value': float(self.interest_value) if self.interest_value else None,
            'legal_fees': float(self.legal_fees) if self.legal_fees else None,
            'scraper_execution_id': self.scraper_execution_id
        }

@dataclass
class ExecutionData:
    """🤖 Dados de uma execução de scraping"""
    
    id: int
    execution_date: date
    status: str = "running"
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    publications_found: int = 0
    publications_new: int = 0
    publications_duplicated: int = 0
    error_message: Optional[str] = None
    dje_url: Optional[str] = None
    host_name: Optional[str] = None
    executed_by: Optional[str] = None
    environment: str = "production"
    
    @classmethod
    def from_api_response(cls, data: Dict[str, Any]) -> 'ExecutionData':
        """🔄 Criar instância a partir da resposta da API"""
        return cls(
            id=data['id'],
            execution_date=datetime.fromisoformat(data['executionDate']).date(),
            status=data.get('status', 'running'),
            start_time=datetime.fromisoformat(data['startTime']) if data.get('startTime') else None,
            end_time=datetime.fromisoformat(data['endTime']) if data.get('endTime') else None,
            publications_found=data.get('publicationsFound', 0),
            publications_new=data.get('publicationsNew', 0),
            publications_duplicated=data.get('publicationsDuplicated', 0),
            error_message=data.get('errorMessage'),
            dje_url=data.get('djeUrl'),
            host_name=data.get('hostName'),
            executed_by=data.get('executedBy'),
            environment=data.get('environment', 'production')
        )
    
    def is_running(self) -> bool:
        """🏃 Verificar se a execução está em andamento"""
        return self.status == "running"
    
    def is_completed(self) -> bool:
        """✅ Verificar se a execução foi concluída"""
        return self.status == "completed"
    
    def is_failed(self) -> bool:
        """❌ Verificar se a execução falhou"""
        return self.status == "failed"

@dataclass
class ScrapingResult:
    """📊 Resultado de uma operação de scraping"""
    
    publications: List[PublicationData] = field(default_factory=list)
    total_found: int = 0
    total_processed: int = 0
    duplicates_found: int = 0
    errors: List[str] = field(default_factory=list)
    pages_scraped: int = 0
    execution_time: float = 0.0
    
    def add_publication(self, publication: PublicationData):
        """➕ Adicionar publicação ao resultado"""
        if publication.is_valid():
            self.publications.append(publication)
            self.total_processed += 1
        else:
            self.errors.append(f"Invalid publication: {publication.process_number}")
    
    def add_error(self, error: str):
        """❌ Adicionar erro ao resultado"""
        self.errors.append(error)
    
    def get_summary(self) -> Dict[str, Any]:
        """📋 Obter resumo dos resultados"""
        return {
            'total_found': self.total_found,
            'total_processed': self.total_processed,
            'valid_publications': len(self.publications),
            'duplicates_found': self.duplicates_found,
            'errors_count': len(self.errors),
            'pages_scraped': self.pages_scraped,
            'execution_time': self.execution_time,
            'success_rate': (
                (self.total_processed / self.total_found * 100) 
                if self.total_found > 0 else 0
            )
        }