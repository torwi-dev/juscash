"""🚀 JusCash DJE Scraper - Entry Point Principal - FIXED ASYNC CLI"""

import asyncio
import sys
import signal
from datetime import date, datetime, timedelta
from typing import Optional
import click
import structlog
from rich.console import Console
from rich.table import Table
from rich.progress import Progress, SpinnerColumn, TextColumn

# Try different import patterns depending on how the module is called
try:
    from .config.settings import settings, logger
    from .services.api_client import get_api_client, close_api_client
    from .services.dje_scraper import get_dje_scraper, close_dje_scraper
    from .models.publication import ExecutionData, ScrapingResult
except ImportError:
    # If relative imports fail, try absolute imports
    try:
        from src.config.settings import settings, logger
        from src.services.api_client import get_api_client, close_api_client
        from src.services.dje_scraper import get_dje_scraper, close_dje_scraper
        from src.models.publication import ExecutionData, ScrapingResult
    except ImportError:
        # Last resort - direct imports
        import sys
        import os
        sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
        from config.settings import settings, logger
        from services.api_client import get_api_client, close_api_client
        from services.dje_scraper import get_dje_scraper, close_dje_scraper
        from models.publication import ExecutionData, ScrapingResult

console = Console()

class ScraperOrchestrator:
    """🎭 Orquestrador principal do scraper"""
    
    def __init__(self):
        self.api_client = None
        self.dje_scraper = None
        self.current_execution: Optional[ExecutionData] = None
        self.should_stop = False
        
        # Setup signal handlers for graceful shutdown
        signal.signal(signal.SIGINT, self._signal_handler)
        signal.signal(signal.SIGTERM, self._signal_handler)
    
    def _signal_handler(self, signum, frame):
        """🛑 Handle shutdown signals"""
        console.print(f"\n[yellow]Received signal {signum}, shutting down gracefully...[/yellow]")
        self.should_stop = True
    
    async def initialize(self):
        """🔧 Inicializar componentes"""
        try:
            console.print("[blue]🔧 Initializing scraper components...[/blue]")
            
            # Initialize API client
            self.api_client = await get_api_client()
            
            # Test API connection
            if not await self.api_client.health_check():
                raise Exception("API health check failed")
            
            # Initialize DJE scraper
            self.dje_scraper = await get_dje_scraper()
            
            console.print("[green]✅ All components initialized successfully[/green]")
            
        except Exception as e:
            console.print(f"[red]❌ Initialization failed: {str(e)}[/red]")
            raise
    
    async def execute_scraping(self, target_date: Optional[date] = None) -> bool:
        """🕷️ Executar scraping para data específica"""
        
        if target_date is None:
            target_date = date.today()
        
        console.print(f"\n[blue]🚀 Starting scraping execution for {target_date}[/blue]")
        
        try:
            # Create execution record
            with console.status("[bold green]Creating execution record..."):
                self.current_execution = await self.api_client.create_execution(target_date)
            
            console.print(f"[green]✅ Execution created with ID: {self.current_execution.id}[/green]")
            
            # Perform scraping
            with Progress(
                SpinnerColumn(),
                TextColumn("[progress.description]{task.description}"),
                console=console
            ) as progress:
                
                scraping_task = progress.add_task(
                    description="Scraping DJE publications...",
                    total=None
                )
                
                result = await self.dje_scraper.scrape_publications(
                    target_date=target_date,
                    execution_id=self.current_execution.id
                )
                
                progress.update(scraping_task, description="Processing results...")
                
                # Upload publications to API
                if result.publications:
                    upload_task = progress.add_task(
                        description="Uploading publications to API...",
                        total=len(result.publications)
                    )
                    
                    created_count, duplicate_count = await self.api_client.bulk_create_publications(
                        result.publications
                    )
                    
                    progress.update(upload_task, completed=len(result.publications))
                    
                else:
                    created_count, duplicate_count = 0, 0
                
                # Update execution as completed
                progress.update(scraping_task, description="Finalizing execution...")
                
                await self.api_client.update_execution(
                    execution_id=self.current_execution.id,
                    status="completed",
                    publications_found=result.total_found,
                    publications_new=created_count
                )
            
            # Display results
            self._display_results(result, created_count, duplicate_count)
            
            console.print(f"[green]🎉 Scraping completed successfully![/green]")
            return True
            
        except Exception as e:
            # Update execution as failed
            if self.current_execution:
                try:
                    await self.api_client.update_execution(
                        execution_id=self.current_execution.id,
                        status="failed",
                        error_message=str(e)
                    )
                except:
                    pass
            
            console.print(f"[red]❌ Scraping failed: {str(e)}[/red]")
            logger.error("Scraping execution failed", error=str(e))
            return False
    
    def _display_results(
        self, 
        result: ScrapingResult, 
        created_count: int, 
        duplicate_count: int
    ):
        """📊 Exibir resultados do scraping"""
        
        table = Table(title="📊 Scraping Results")
        table.add_column("Metric", style="cyan")
        table.add_column("Value", style="bold white")
        
        summary = result.get_summary()
        
        table.add_row("🔍 Publications Found", str(summary['total_found']))
        table.add_row("✅ Valid Publications", str(summary['valid_publications']))
        table.add_row("📤 Successfully Created", str(created_count))
        table.add_row("🔄 Duplicates Found", str(duplicate_count))
        table.add_row("❌ Errors", str(summary['errors_count']))
        table.add_row("📄 Pages Scraped", str(summary['pages_scraped']))
        table.add_row("⏱️ Execution Time", f"{summary['execution_time']:.2f}s")
        table.add_row("📈 Success Rate", f"{summary['success_rate']:.1f}%")
        
        console.print(table)
        
        # Show errors if any
        if result.errors:
            console.print("\n[yellow]⚠️ Errors encountered:[/yellow]")
            for error in result.errors[:5]:  # Show first 5 errors
                console.print(f"   • {error}")
            
            if len(result.errors) > 5:
                console.print(f"   ... and {len(result.errors) - 5} more errors")
    
    async def run_scheduled_execution(self):
        """⏰ Executar scraping agendado"""
        console.print("[blue]⏰ Running scheduled scraping execution[/blue]")
        
        # Check if there's already an execution for today
        today_execution = await self.api_client.get_today_execution()
        
        if today_execution and today_execution.is_completed():
            console.print("[yellow]ℹ️ Scraping already completed for today[/yellow]")
            return True
        
        if today_execution and today_execution.is_running():
            console.print("[yellow]ℹ️ Scraping already running for today[/yellow]")
            return False
        
        # Execute scraping for today
        return await self.execute_scraping(date.today())
    
    async def run_historical_scraping(self, start_date: date, end_date: date):
        """📅 Executar scraping histórico"""
        console.print(
            f"[blue]📅 Running historical scraping from {start_date} to {end_date}[/blue]"
        )
        
        current_date = start_date
        successful_count = 0
        failed_count = 0
        
        while current_date <= end_date and not self.should_stop:
            console.print(f"\n[cyan]Processing date: {current_date}[/cyan]")
            
            if await self.execute_scraping(current_date):
                successful_count += 1
            else:
                failed_count += 1
            
            # Move to next day
            current_date += timedelta(days=1)
            
            # Small delay between dates
            if current_date <= end_date:
                await asyncio.sleep(5)
        
        console.print(
            f"\n[blue]📊 Historical scraping completed: "
            f"{successful_count} successful, {failed_count} failed[/blue]"
        )
    
    async def cleanup(self):
        """🧹 Limpeza de recursos"""
        console.print("[blue]🧹 Cleaning up resources...[/blue]")
        
        try:
            await close_dje_scraper()
            await close_api_client()
            console.print("[green]✅ Cleanup completed[/green]")
            
        except Exception as e:
            console.print(f"[yellow]⚠️ Cleanup warning: {str(e)}[/yellow]")

# Utility function to run async commands with Click
def run_async(coro):
    """🔄 Utility to run async functions with Click"""
    def wrapper(*args, **kwargs):
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            return loop.run_until_complete(coro(*args, **kwargs))
        finally:
            loop.close()
    return wrapper

# CLI Commands
@click.group()
@click.option('--debug', is_flag=True, help='Enable debug logging')
def cli(debug):
    """🏛️ JusCash DJE Scraper CLI"""
    if debug:
        import logging
        logging.getLogger().setLevel(logging.DEBUG)

@cli.command()
@click.option('--date', type=click.DateTime(formats=['%Y-%m-%d']), help='Target date (YYYY-MM-DD)')
@run_async
async def scrape(date_param):
    """🕷️ Execute scraping for specific date"""
    orchestrator = ScraperOrchestrator()
    
    try:
        await orchestrator.initialize()
        
        target_date = date_param.date() if date_param else date.today()
        success = await orchestrator.execute_scraping(target_date)
        
        sys.exit(0 if success else 1)
        
    except KeyboardInterrupt:
        console.print("\n[yellow]Scraping interrupted by user[/yellow]")
        sys.exit(130)
    except Exception as e:
        console.print(f"[red]Fatal error: {str(e)}[/red]")
        sys.exit(1)
    finally:
        await orchestrator.cleanup()

@cli.command()
@run_async
async def scheduled():
    """⏰ Run scheduled scraping (for cron/Azure Functions)"""
    orchestrator = ScraperOrchestrator()
    
    try:
        await orchestrator.initialize()
        success = await orchestrator.run_scheduled_execution()
        sys.exit(0 if success else 1)
        
    except Exception as e:
        console.print(f"[red]Scheduled execution failed: {str(e)}[/red]")
        sys.exit(1)
    finally:
        await orchestrator.cleanup()

@cli.command()
@click.option('--start-date', required=True, type=click.DateTime(formats=['%Y-%m-%d']))
@click.option('--end-date', required=True, type=click.DateTime(formats=['%Y-%m-%d']))
@run_async
async def historical(start_date, end_date):
    """📅 Run historical scraping for date range"""
    orchestrator = ScraperOrchestrator()
    
    try:
        await orchestrator.initialize()
        await orchestrator.run_historical_scraping(
            start_date.date(), 
            end_date.date()
        )
        
    except KeyboardInterrupt:
        console.print("\n[yellow]Historical scraping interrupted[/yellow]")
    except Exception as e:
        console.print(f"[red]Historical scraping failed: {str(e)}[/red]")
        sys.exit(1)
    finally:
        await orchestrator.cleanup()

@cli.command()
@run_async
async def test():
    """🧪 Test scraper components"""
    console.print("[blue]🧪 Testing scraper components...[/blue]")
    
    orchestrator = ScraperOrchestrator()
    
    try:
        # Test API connection
        console.print("Testing API connection...")
        await orchestrator.initialize()
        
        # Test browser setup
        console.print("Testing browser setup...")
        await orchestrator.dje_scraper.setup_driver()
        
        # Test DJE navigation
        console.print("Testing DJE navigation...")
        await orchestrator.dje_scraper.navigate_to_search_page()
        
        console.print("[green]✅ All tests passed![/green]")
        
    except Exception as e:
        console.print(f"[red]❌ Test failed: {str(e)}[/red]")
        sys.exit(1)
    finally:
        await orchestrator.cleanup()

# Main entry point
def main():
    """🚀 Main entry point"""
    console.print("""
[bold blue]🏛️ JusCash DJE Scraper[/bold blue]
[dim]Sistema de automação para DJE São Paulo[/dim]
    """)
    
    # Show configuration
    console.print(f"[dim]API: {settings.api_base_url}[/dim]")
    console.print(f"[dim]Environment: {settings.environment}[/dim]")
    console.print(f"[dim]Host: {settings.execution_host}[/dim]")
    
    # Run CLI
    cli()

if __name__ == "__main__":
    main()