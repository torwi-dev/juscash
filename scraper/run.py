import sys
import os
import asyncio
from datetime import date
import click

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

# Import after path setup
from main import ScraperOrchestrator

@click.group()
@click.option('--debug', is_flag=True, help='Enable debug logging')
def cli(debug):
    """🏛️ JusCash DJE Scraper CLI"""
    if debug:
        import logging
        logging.getLogger().setLevel(logging.DEBUG)

@cli.command()
@click.option('--date', 'date_param', type=click.DateTime(formats=['%Y-%m-%d']), help='Target date (YYYY-MM-DD)')
def scrape(date_param):
    """🕷️ Execute scraping for specific date"""
    async def run_scrape():
        orchestrator = ScraperOrchestrator()
        try:
            await orchestrator.initialize()
            target_date = date_param.date() if date_param else date.today()
            success = await orchestrator.execute_scraping(target_date)
            return 0 if success else 1
        except Exception as e:
            print(f"Error: {e}")
            return 1
        finally:
            await orchestrator.cleanup()
    
    exit_code = asyncio.run(run_scrape())
    sys.exit(exit_code)

@cli.command()
def test():
    """🧪 Test scraper components"""
    async def run_test():
        orchestrator = ScraperOrchestrator()
        try:
            print("Testing API connection...")
            await orchestrator.initialize()
            print("✅ All tests passed!")
            return 0
        except Exception as e:
            print(f"❌ Test failed: {e}")
            return 1
        finally:
            await orchestrator.cleanup()
    
    exit_code = asyncio.run(run_test())
    sys.exit(exit_code)

if __name__ == "__main__":
    cli()