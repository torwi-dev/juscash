"""⚡ Circuit Breaker Pattern para proteção contra falhas em cascata"""

import time
import threading
from enum import Enum
from typing import Callable, Any, Optional
import structlog

logger = structlog.get_logger(__name__)

class CircuitState(Enum):
    """🔄 Estados do Circuit Breaker"""
    CLOSED = "closed"       # Normal operation
    OPEN = "open"           # Failing fast
    HALF_OPEN = "half_open" # Testing if service recovered

class CircuitBreakerError(Exception):
    """🚨 Erro do Circuit Breaker"""
    pass

class CircuitBreaker:
    """⚡ Circuit Breaker implementation"""
    
    def __init__(
        self,
        failure_threshold: int = 5,
        recovery_timeout: int = 60,
        expected_exception: type = Exception
    ):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.expected_exception = expected_exception
        
        self.failure_count = 0
        self.last_failure_time: Optional[float] = None
        self.state = CircuitState.CLOSED
        self._lock = threading.Lock()
        
        logger.info(
            "Circuit breaker initialized",
            failure_threshold=failure_threshold,
            recovery_timeout=recovery_timeout,
            expected_exception=expected_exception.__name__
        )
    
    def __enter__(self):
        """🚪 Context manager entry"""
        with self._lock:
            if self.state == CircuitState.OPEN:
                if self._should_attempt_reset():
                    self._reset_to_half_open()
                else:
                    raise CircuitBreakerError(
                        f"Circuit breaker is OPEN. "
                        f"Failure count: {self.failure_count}/{self.failure_threshold}. "
                        f"Will retry after {self.recovery_timeout}s"
                    )
            
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """🚪 Context manager exit"""
        with self._lock:
            if exc_type is None:
                # Success
                self._on_success()
            elif issubclass(exc_type, self.expected_exception):
                # Expected failure
                self._on_failure()
            # Unexpected exceptions pass through without affecting circuit breaker
    
    def _should_attempt_reset(self) -> bool:
        """🔄 Check if enough time has passed to attempt reset"""
        return (
            self.last_failure_time is not None and
            time.time() - self.last_failure_time >= self.recovery_timeout
        )
    
    def _reset_to_half_open(self):
        """🔄 Reset circuit breaker to half-open state"""
        self.state = CircuitState.HALF_OPEN
        logger.info(
            "Circuit breaker reset to HALF_OPEN",
            failure_count=self.failure_count,
            time_since_last_failure=time.time() - (self.last_failure_time or 0)
        )
    
    def _on_success(self):
        """✅ Handle successful operation"""
        if self.state == CircuitState.HALF_OPEN:
            # Success in half-open state -> close circuit
            self._reset()
            logger.info("Circuit breaker reset to CLOSED after successful test")
        # Success in closed state -> no action needed
    
    def _on_failure(self):
        """❌ Handle failed operation"""
        self.failure_count += 1
        self.last_failure_time = time.time()
        
        if self.state == CircuitState.HALF_OPEN:
            # Failure in half-open state -> back to open
            self.state = CircuitState.OPEN
            logger.warning(
                "Circuit breaker back to OPEN after failed test",
                failure_count=self.failure_count
            )
        elif self.failure_count >= self.failure_threshold:
            # Too many failures -> open circuit
            self.state = CircuitState.OPEN
            logger.error(
                "Circuit breaker OPENED due to failure threshold",
                failure_count=self.failure_count,
                threshold=self.failure_threshold
            )
    
    def _reset(self):
        """🔄 Reset circuit breaker to initial state"""
        self.failure_count = 0
        self.last_failure_time = None
        self.state = CircuitState.CLOSED
    
    @property
    def is_closed(self) -> bool:
        """✅ Check if circuit is closed (normal operation)"""
        return self.state == CircuitState.CLOSED
    
    @property
    def is_open(self) -> bool:
        """❌ Check if circuit is open (failing fast)"""
        return self.state == CircuitState.OPEN
    
    @property
    def is_half_open(self) -> bool:
        """🔄 Check if circuit is half-open (testing)"""
        return self.state == CircuitState.HALF_OPEN
    
    def get_stats(self) -> dict:
        """📊 Get circuit breaker statistics"""
        return {
            "state": self.state.value,
            "failure_count": self.failure_count,
            "failure_threshold": self.failure_threshold,
            "last_failure_time": self.last_failure_time,
            "recovery_timeout": self.recovery_timeout,
            "time_since_last_failure": (
                time.time() - self.last_failure_time 
                if self.last_failure_time else None
            )
        }

def circuit_breaker(
    failure_threshold: int = 5,
    recovery_timeout: int = 60,
    expected_exception: type = Exception
):
    """🎨 Decorator para aplicar circuit breaker em funções"""
    
    def decorator(func: Callable) -> Callable:
        cb = CircuitBreaker(
            failure_threshold=failure_threshold,
            recovery_timeout=recovery_timeout,
            expected_exception=expected_exception
        )
        
        def wrapper(*args, **kwargs):
            with cb:
                return func(*args, **kwargs)
        
        # Attach circuit breaker stats to function
        wrapper.circuit_breaker = cb
        return wrapper
    
    return decorator

# Example usage:
# @circuit_breaker(failure_threshold=3, recovery_timeout=30)
# def risky_operation():
#     # This function will be protected by circuit breaker
#     pass