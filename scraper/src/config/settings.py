import os
from typing import Optional, List
from pydantic_settings import BaseSettings
from pydantic import Field, validator
import logging

class Settings(BaseSettings):
    """⚙️ Configurações do Scraper DJE - VERSÃO CORRIGIDA"""
    
    debug_save_extracted_text: bool = False
    # API Configuration - USANDO TOKEN
    api_base_url: str = Field(default="https://juscash-api.azurewebsites.net", env="API_BASE_URL")
    api_token: str = Field(env="API_TOKEN")  # OBRIGATÓRIO
    api_timeout: int = Field(default=30, env="API_TIMEOUT")
    api_retry_attempts: int = Field(default=3, env="API_RETRY_ATTEMPTS")
    api_retry_delay: float = Field(default=1.0, env="API_RETRY_DELAY")
    
    # DJE Configuration - CORRIGIDO
    dje_base_url: str = Field(default="https://dje.tjsp.jus.br", env="DJE_BASE_URL")
    dje_search_url: str = Field(
        default="https://dje.tjsp.jus.br/cdje/consultaAvancada.do",
        env="DJE_SEARCH_URL"
    )
    dje_timeout: int = Field(default=60, env="DJE_TIMEOUT")
    dje_retry_attempts: int = Field(default=5, env="DJE_RETRY_ATTEMPTS")
    dje_delay_between_requests: float = Field(default=2.0, env="DJE_DELAY")
    
    # Scraping Configuration
    target_caderno: str = Field(default="12", env="TARGET_CADERNO")  # Value do select HTML
    target_part: str = Field(default="1", env="TARGET_PART")
    search_terms: str = Field(
        default='"RPV" E "pagamento pelo INSS"',
        env="SEARCH_TERMS"
    )  # String com operadores lógicos do DJE
    max_pages_per_execution: int = Field(default=50, env="MAX_PAGES")
    concurrent_requests: int = Field(default=3, env="CONCURRENT_REQUESTS")
    
    # PDF Processing Configuration - NOVO
    pdf_timeout: int = Field(default=30, env="PDF_TIMEOUT")
    pdf_max_size_mb: int = Field(default=50, env="PDF_MAX_SIZE_MB")
    ocr_language: str = Field(default="por", env="OCR_LANGUAGE")
    ocr_config: str = Field(default="--psm 6", env="OCR_CONFIG")
    
    # Browser Configuration (Selenium)
    headless_browser: bool = Field(default=True, env="HEADLESS_BROWSER")
    browser_timeout: int = Field(default=30, env="BROWSER_TIMEOUT")
    implicit_wait: int = Field(default=10, env="IMPLICIT_WAIT")
    
    # Environment
    environment: str = Field(default="production", env="ENVIRONMENT")
    debug: bool = Field(default=False, env="DEBUG")
    log_level: str = Field(default="INFO", env="LOG_LEVEL")
    
    # Azure/Cloud Configuration
    execution_host: str = Field(default="local", env="EXECUTION_HOST")
    executed_by: str = Field(default="python-scraper", env="EXECUTED_BY")
    
    # Circuit Breaker
    circuit_breaker_failure_threshold: int = Field(default=5, env="CB_FAILURE_THRESHOLD")
    circuit_breaker_recovery_timeout: int = Field(default=60, env="CB_RECOVERY_TIMEOUT")
    circuit_breaker_expected_exception: str = Field(
        default="requests.exceptions.RequestException",
        env="CB_EXPECTED_EXCEPTION"
    )
    
    @validator('log_level')
    def validate_log_level(cls, v):
        valid_levels = ['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL']
        if v.upper() not in valid_levels:
            raise ValueError(f'Log level must be one of: {valid_levels}')
        return v.upper()
    
    class Config:
        env_file = ".env"
        env_file_encoding = 'utf-8'
        case_sensitive = False
        
    def get_api_headers(self) -> dict:
        """📡 Headers para API requests"""
        headers = {
            "Content-Type": "application/json",
            "User-Agent": f"JusCash-Scraper/{self.environment}",
            "Authorization": f"Bearer {self.api_token}"
        }
        
        return headers
    
    def get_browser_options(self):
        """🌐 Opções do browser para Selenium"""
        from selenium.webdriver.chrome.options import Options
        
        options = Options()
        
        if self.headless_browser:
            options.add_argument('--headless')
            
        # Otimizações para performance
        options.add_argument('--no-sandbox')
        options.add_argument('--disable-dev-shm-usage')
        options.add_argument('--disable-gpu')
        options.add_argument('--disable-web-security')
        options.add_argument('--disable-extensions')
        options.add_argument('--disable-images')
        options.add_argument('--disable-plugins')
        
        # User agent
        options.add_argument(f'--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
        
        return options

# Singleton instance
settings = Settings()

# Logging configuration
def setup_logging():
    """🔧 Configurar logging estruturado"""
    import structlog
    
    # Configure structlog
    structlog.configure(
        processors=[
            structlog.stdlib.filter_by_level,
            structlog.stdlib.add_logger_name,
            structlog.stdlib.add_log_level,
            structlog.stdlib.PositionalArgumentsFormatter(),
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.processors.UnicodeDecoder(),
            structlog.processors.JSONRenderer()
        ],
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        cache_logger_on_first_use=True,
    )
    
    # Configure standard logging
    logging.basicConfig(
        format="%(message)s",
        stream=None,
        level=getattr(logging, settings.log_level),
    )
    
    return structlog.get_logger()

# Export logger
logger = setup_logging()