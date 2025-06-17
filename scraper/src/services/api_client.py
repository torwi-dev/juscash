"""🚀 Cliente API para Backend JusCash com Token Authentication"""

import asyncio
import hashlib
from datetime import datetime, date
from typing import Optional, List, Dict, Any
import httpx
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
import structlog

from ..config.settings import settings
from ..utils.circuit_breaker import CircuitBreaker
from ..models.publication import PublicationData, ExecutionData

logger = structlog.get_logger(__name__)

class APIClientError(Exception):
    """🚨 Erro do cliente API"""
    pass

class AuthenticationError(APIClientError):
    """🔐 Erro de autenticação"""
    pass

class APIClient:
    """🌐 Cliente HTTP para Backend API com token authentication"""
    
    def __init__(self):
        self.base_url = settings.api_base_url.rstrip('/')
        self.timeout = settings.api_timeout
        self.token: str = settings.api_token  # TOKEN DIRETO
        self.circuit_breaker = CircuitBreaker(
            failure_threshold=settings.circuit_breaker_failure_threshold,
            recovery_timeout=settings.circuit_breaker_recovery_timeout
        )
        
        # Configure HTTP client
        self.client = httpx.AsyncClient(
            timeout=httpx.Timeout(self.timeout),
            headers=self._get_base_headers(),
            follow_redirects=True
        )
        
        logger.info("API Client initialized with token auth", base_url=self.base_url)
    
    def _get_base_headers(self) -> Dict[str, str]:
        """📡 Headers base para requests"""
        headers = {
            "Content-Type": "application/json",
            "User-Agent": f"JusCash-Scraper/{settings.environment}",
            "Accept": "application/json",
            "Authorization": f"Bearer {self.token}"
        }
            
        return headers
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=10),
        retry=retry_if_exception_type((httpx.RequestError, httpx.HTTPStatusError))
    )
    async def _make_request(
        self, 
        method: str, 
        endpoint: str, 
        **kwargs
    ) -> httpx.Response:
        """🔄 Fazer request HTTP com retry automático"""
        
        url = f"{self.base_url}{endpoint}"
        
        try:
            # Circuit breaker protection
            with self.circuit_breaker:
                logger.debug(
                    "Making API request",
                    method=method,
                    url=url,
                    headers=kwargs.get('headers', {})
                )
                
                response = await self.client.request(method, url, **kwargs)
                
                # Raise for HTTP errors
                response.raise_for_status()
                
                logger.debug(
                    "API request successful",
                    method=method,
                    url=url,
                    status_code=response.status_code
                )
                
                return response
                
        except httpx.HTTPStatusError as e:
            logger.error(
                "HTTP error in API request",
                method=method,
                url=url,
                status_code=e.response.status_code,
                response_text=e.response.text
            )
            
            # Handle specific status codes
            if e.response.status_code == 401:
                raise AuthenticationError("Token inválido ou expirado")
            elif e.response.status_code == 429:
                await asyncio.sleep(5)  # Rate limit backoff
                raise
            else:
                raise APIClientError(f"HTTP {e.response.status_code}: {e.response.text}")
                
        except httpx.RequestError as e:
            logger.error(
                "Request error in API call",
                method=method,
                url=url,
                error=str(e)
            )
            raise APIClientError(f"Erro de conexão: {str(e)}")
    
    async def authenticate(self) -> bool:
        """🔐 Verificar autenticação com token"""
        
        if not self.token:
            raise AuthenticationError("API_TOKEN não configurado nas variáveis de ambiente")
        
        try:
            # Testar token com health check
            if await self.health_check():
                logger.info("Token authentication successful")
                return True
            else:
                raise AuthenticationError("Token inválido ou API indisponível")
                
        except Exception as e:
            logger.error("Token authentication failed", error=str(e))
            raise AuthenticationError(f"Falha na autenticação com token: {str(e)}")
    
    async def create_execution(self, execution_date: date) -> ExecutionData:
        """🚀 Criar nova execução de scraping"""
        
        try:
            response = await self._make_request(
                "POST",
                "/api/scraper/executions",
                json={
                    "executionDate": execution_date.isoformat(),
                    "djeUrl": settings.dje_search_url,
                    "hostName": settings.execution_host,
                    "executedBy": settings.executed_by,
                    "environment": settings.environment
                }
            )
            
            data = response.json()
            execution = ExecutionData.from_api_response(data["execution"])
            
            logger.info(
                "Execution created successfully",
                execution_id=execution.id,
                execution_date=execution_date
            )
            
            return execution
            
        except APIClientError as e:
            if "já existe" in str(e).lower():
                logger.warning(
                    "Execution already exists for date",
                    execution_date=execution_date
                )
                # Try to get existing execution
                return await self.get_today_execution()
            raise
    
    async def get_today_execution(self) -> Optional[ExecutionData]:
        """📅 Buscar execução de hoje"""
        
        try:
            response = await self._make_request("GET", "/api/scraper/today")
            data = response.json()
            
            return ExecutionData.from_api_response(data)
            
        except APIClientError as e:
            if "404" in str(e):
                return None
            raise
    
    async def update_execution(
        self, 
        execution_id: int, 
        status: str,
        publications_found: int = 0,
        publications_new: int = 0,
        error_message: Optional[str] = None
    ) -> ExecutionData:
        """📝 Atualizar status da execução"""
        
        payload = {
            "status": status,
            "endTime": datetime.now().isoformat()
        }
        
        if status == "completed":
            payload.update({
                "publicationsFound": publications_found,
                "publicationsNew": publications_new,
                "publicationsDuplicated": publications_found - publications_new
            })
        elif status == "failed" and error_message:
            payload["errorMessage"] = error_message
        
        try:
            response = await self._make_request(
                "PATCH",
                f"/api/scraper/executions/{execution_id}",
                json=payload
            )
            
            data = response.json()
            execution = ExecutionData.from_api_response(data["execution"])
            
            logger.info(
                "Execution updated successfully",
                execution_id=execution_id,
                status=status,
                publications_found=publications_found,
                publications_new=publications_new
            )
            
            return execution
            
        except Exception as e:
            logger.error(
                "Failed to update execution",
                execution_id=execution_id,
                status=status,
                error=str(e)
            )
            raise
    
    async def create_publication(self, publication: PublicationData) -> bool:
        """📄 Criar nova publicação"""
        
        try:
            # Generate content hash
            if publication.full_content:
                content_hash = hashlib.md5(
                    publication.full_content.encode('utf-8')
                ).hexdigest()
            else:
                content_hash = None
            
            payload = {
                "processNumber": publication.process_number,
                "authors": publication.authors,
                "lawyers": publication.lawyers,
                "defendant": "Instituto Nacional do Seguro Social - INSS",  # Sempre INSS
                "fullContent": publication.full_content,
                "sourceUrl": publication.source_url,
                "scraperExecutionId": publication.scraper_execution_id,
                "contentHash": content_hash
            }
            
            # Add optional fields
            if publication.publication_date:
                payload["publicationDate"] = publication.publication_date.isoformat()
            
            if publication.availability_date:
                payload["availabilityDate"] = publication.availability_date.isoformat()
            
            if publication.main_value is not None:
                payload["mainValue"] = float(publication.main_value)
            
            if publication.interest_value is not None:
                payload["interestValue"] = float(publication.interest_value)
            
            if publication.legal_fees is not None:
                payload["legalFees"] = float(publication.legal_fees)
            
            response = await self._make_request(
                "POST",
                "/api/publications",
                json=payload
            )
            
            logger.info(
                "Publication created successfully",
                process_number=publication.process_number,
                execution_id=publication.scraper_execution_id
            )
            
            return True
            
        except APIClientError as e:
            if "já existe" in str(e).lower() or "duplicate" in str(e).lower():
                logger.debug(
                    "Publication already exists (duplicate)",
                    process_number=publication.process_number
                )
                return False  # Duplicate, not an error
            
            logger.error(
                "Failed to create publication",
                process_number=publication.process_number,
                error=str(e)
            )
            raise
    
    async def bulk_create_publications(
        self, 
        publications: List[PublicationData]
    ) -> tuple[int, int]:
        """📦 Criar múltiplas publicações em lote"""
        
        created_count = 0
        duplicate_count = 0
        
        # Process in batches to avoid overwhelming the API
        batch_size = 10
        batches = [
            publications[i:i + batch_size] 
            for i in range(0, len(publications), batch_size)
        ]
        
        for batch_num, batch in enumerate(batches, 1):
            logger.info(
                "Processing publication batch",
                batch_num=batch_num,
                total_batches=len(batches),
                batch_size=len(batch)
            )
            
            # Process batch with some concurrency
            tasks = [self.create_publication(pub) for pub in batch]
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            for pub, result in zip(batch, results):
                if isinstance(result, Exception):
                    logger.error(
                        "Failed to create publication in batch",
                        process_number=pub.process_number,
                        error=str(result)
                    )
                elif result is True:
                    created_count += 1
                else:  # result is False (duplicate)
                    duplicate_count += 1
            
            # Small delay between batches
            if batch_num < len(batches):
                await asyncio.sleep(1)
        
        logger.info(
            "Bulk publication creation completed",
            total_publications=len(publications),
            created=created_count,
            duplicates=duplicate_count
        )
        
        return created_count, duplicate_count
    
    async def health_check(self) -> bool:
        """💚 Verificar saúde da API"""
        
        try:
            response = await self._make_request("GET", "/health")
            return response.status_code == 200
            
        except Exception as e:
            logger.error("Health check failed", error=str(e))
            return False
    
    async def close(self):
        """🔒 Fechar cliente HTTP"""
        await self.client.aclose()
        logger.info("API client closed")

# Singleton instance
_api_client: Optional[APIClient] = None

async def get_api_client() -> APIClient:
    """🌐 Get singleton API client instance"""
    global _api_client
    
    if _api_client is None:
        _api_client = APIClient()
        await _api_client.authenticate()
    
    return _api_client

async def close_api_client():
    """🔒 Close singleton API client"""
    global _api_client
    
    if _api_client:
        await _api_client.close()
        _api_client = None