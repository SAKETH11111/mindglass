"""
Industry-Specific Agent Factory for MindGlass
Creates specialized agents based on industry selection
"""

from typing import Dict, Any, AsyncGenerator, Optional, Type
from cerebras.cloud.sdk import Cerebras

from app.agents.base import LLMAgent
from app.config import settings


def create_industry_agent_class(
    agent_id: str,
    name: str,
    description: str,
    prompt_file: str,
    color: str = "#6B7280"
) -> Type[LLMAgent]:
    """
    Factory function to create industry-specific agent classes.
    """
    class IndustryAgent(LLMAgent):
        def __init__(self, api_key: str | None = None):
            super().__init__(
                agent_id=agent_id,
                name=name,
                description=description,
                prompt_file=prompt_file,
                model="llama-3.3-70b"
            )
            self.color = color
            resolved_key = api_key or settings.CEREBRAS_API_KEY
            if not resolved_key:
                raise ValueError("CEREBRAS_API_KEY environment variable not set")
            self.client = Cerebras(api_key=resolved_key)

        async def stream_response(self, query: str, model_override: str = None, use_reasoning: bool = False) -> AsyncGenerator[Dict[str, Any], None]:
            """Stream a response using Cerebras API."""
            import asyncio
            import time

            self.set_status("processing")
            model_to_use = model_override or self.model
            start_time = time.time()
            token_count = 0

            try:
                params = {
                    "model": model_to_use,
                    "messages": [
                        {"role": "system", "content": self.system_prompt},
                        {"role": "user", "content": query}
                    ],
                    "stream": True
                }
                stream = self.client.chat.completions.create(**params)

                loop = asyncio.get_event_loop()

                def get_next_chunk(iterator):
                    try:
                        return next(iterator)
                    except StopIteration:
                        return None

                iterator = iter(stream)
                final_usage = None
                final_time_info = None

                while True:
                    chunk = await loop.run_in_executor(None, get_next_chunk, iterator)
                    if chunk is None:
                        break

                    if hasattr(chunk, 'usage') and chunk.usage:
                        final_usage = chunk.usage
                    if hasattr(chunk, 'time_info') and chunk.time_info:
                        final_time_info = chunk.time_info

                    if hasattr(chunk.choices[0].delta, 'content') and chunk.choices[0].delta.content:
                        content = chunk.choices[0].delta.content
                        token_count += 1
                        yield self._create_token_message(content)

                completion_time = None
                if final_time_info and hasattr(final_time_info, 'completion_time'):
                    completion_time = final_time_info.completion_time

                elapsed = None
                if completion_time and completion_time > 0:
                    completion_tokens_count = final_usage.completion_tokens if final_usage else token_count
                    tokens_per_second = completion_tokens_count / completion_time
                else:
                    elapsed = time.time() - start_time
                    tokens_per_second = token_count / elapsed if elapsed > 0 else 0

                metrics_time = completion_time if completion_time and completion_time > 0 else (elapsed or 0)

                prompt_tokens = final_usage.prompt_tokens if final_usage else 0
                completion_tokens = final_usage.completion_tokens if final_usage else token_count
                total_tokens = final_usage.total_tokens if final_usage else token_count

                yield self._create_metrics_message(
                    tokens_per_second=tokens_per_second,
                    total_tokens=total_tokens,
                    prompt_tokens=prompt_tokens,
                    completion_tokens=completion_tokens,
                    completion_time=metrics_time,
                )
                yield self._create_done_message()
                self.set_status("idle")

            except Exception as e:
                self.set_status("error")
                yield {"type": "error", "agentId": self.agent_id, "error": str(e)}

        async def process(self, input_data: Any) -> Dict[str, Any]:
            return {"result": "processed", "agent_id": self.agent_id}

        def get_capabilities(self):
            return ["industry_analysis", "streaming"]

    # Set a meaningful class name
    IndustryAgent.__name__ = f"{agent_id.title().replace('_', '')}Agent"
    return IndustryAgent


# Industry-specific agent definitions
INDUSTRY_AGENTS = {
    # SaaS / Software
    "saas": {
        "saas_metrics": {
            "name": "SaaS Metrics",
            "description": "Analyzes MRR, ARR, CAC, LTV, churn and SaaS unit economics",
            "prompt_file": "saas_metrics.txt",
            "color": "#3B82F6"  # Blue
        },
        "saas_growth": {
            "name": "Growth Strategy",
            "description": "Evaluates PLG, sales-led, pricing, and market positioning",
            "prompt_file": "saas_growth.txt",
            "color": "#10B981"  # Green
        }
    },
    # E-commerce / Retail
    "ecommerce": {
        "ecommerce_conversion": {
            "name": "Conversion Expert",
            "description": "Analyzes funnel optimization, CRO, and customer journey",
            "prompt_file": "ecommerce_conversion.txt",
            "color": "#F59E0B"  # Amber
        },
        "ecommerce_operations": {
            "name": "E-commerce Ops",
            "description": "Evaluates fulfillment, logistics, and supply chain",
            "prompt_file": "ecommerce_operations.txt",
            "color": "#8B5CF6"  # Purple
        }
    },
    # Fintech / Banking
    "fintech": {
        "fintech_compliance": {
            "name": "Fintech Compliance",
            "description": "Analyzes regulatory, licensing, and compliance requirements",
            "prompt_file": "fintech_compliance.txt",
            "color": "#EF4444"  # Red
        },
        "fintech_risk": {
            "name": "Fintech Risk",
            "description": "Evaluates fraud, credit risk, and security implications",
            "prompt_file": "fintech_risk.txt",
            "color": "#F97316"  # Orange
        }
    },
    # Healthcare / Biotech
    "healthcare": {
        "healthcare_clinical": {
            "name": "Clinical Expert",
            "description": "Analyzes clinical evidence, patient outcomes, and care pathways",
            "prompt_file": "healthcare_clinical.txt",
            "color": "#06B6D4"  # Cyan
        },
        "healthcare_regulatory": {
            "name": "Healthcare Regulatory",
            "description": "Evaluates HIPAA, FDA, and healthcare compliance",
            "prompt_file": "healthcare_regulatory.txt",
            "color": "#EC4899"  # Pink
        }
    },
    # Manufacturing
    "manufacturing": {
        "manufacturing_operations": {
            "name": "Manufacturing Ops",
            "description": "Analyzes production efficiency, lean, and supply chain",
            "prompt_file": "manufacturing_operations.txt",
            "color": "#6366F1"  # Indigo
        },
        "manufacturing_quality": {
            "name": "Quality & Compliance",
            "description": "Evaluates ISO, safety, and quality standards",
            "prompt_file": "manufacturing_quality.txt",
            "color": "#14B8A6"  # Teal
        }
    },
    # Consulting / Agency
    "consulting": {
        "consulting_client": {
            "name": "Client Strategy",
            "description": "Analyzes client relationships and business development",
            "prompt_file": "consulting_client.txt",
            "color": "#A855F7"  # Purple
        },
        "consulting_delivery": {
            "name": "Delivery Expert",
            "description": "Evaluates project delivery, resources, and utilization",
            "prompt_file": "consulting_delivery.txt",
            "color": "#22C55E"  # Green
        }
    }
}


def get_industry_agent_registry(industry: Optional[str] = None) -> Dict[str, Type[LLMAgent]]:
    """
    Get agent registry, optionally including industry-specific agents.
    
    When an industry is specified, replaces the generic 'finance' and 'risk' agents
    with industry-specific specialists.
    """
    from app.agents import AGENT_REGISTRY
    
    # Start with base registry
    registry = AGENT_REGISTRY.copy()
    
    if not industry or industry not in INDUSTRY_AGENTS:
        return registry
    
    # Get industry-specific agents
    industry_agents = INDUSTRY_AGENTS[industry]
    
    # Create and add industry-specific agent classes
    for agent_id, config in industry_agents.items():
        agent_class = create_industry_agent_class(
            agent_id=agent_id,
            name=config["name"],
            description=config["description"],
            prompt_file=config["prompt_file"],
            color=config["color"]
        )
        registry[agent_id] = agent_class
    
    return registry


def get_industry_agent_ids(industry: Optional[str] = None) -> list:
    """
    Get the list of agent IDs to use for a given industry.
    
    For industry-specific runs, replaces finance and risk with industry specialists.
    """
    base_agents = ["analyst", "optimist", "pessimist", "critic", "strategist", "finance", "risk", "synthesizer"]
    
    if not industry or industry not in INDUSTRY_AGENTS:
        return base_agents
    
    # Get industry-specific agent IDs
    industry_agent_ids = list(INDUSTRY_AGENTS[industry].keys())
    
    # Replace finance and risk with industry-specific agents
    result = []
    for agent_id in base_agents:
        if agent_id == "finance":
            result.append(industry_agent_ids[0])  # First industry agent
        elif agent_id == "risk":
            result.append(industry_agent_ids[1])  # Second industry agent
        else:
            result.append(agent_id)
    
    return result


# Export industry agent info for frontend
def get_industry_agent_info(industry: Optional[str] = None) -> Dict[str, Dict[str, str]]:
    """
    Get agent info (names, colors) for the selected industry.
    Used by frontend to update agent display.
    """
    from app.agents import AGENT_REGISTRY
    
    # Base agent info
    base_info = {
        "analyst": {"name": "Analyst", "color": "#3B82F6"},
        "optimist": {"name": "Optimist", "color": "#22C55E"},
        "pessimist": {"name": "Pessimist", "color": "#6B7280"},
        "critic": {"name": "Critic", "color": "#EF4444"},
        "strategist": {"name": "Strategist", "color": "#8B5CF6"},
        "finance": {"name": "Finance", "color": "#EAB308"},
        "risk": {"name": "Risk", "color": "#F97316"},
        "synthesizer": {"name": "Synthesizer", "color": "#06B6D4"},
    }
    
    if not industry or industry not in INDUSTRY_AGENTS:
        return base_info
    
    # Copy base info
    result = base_info.copy()
    
    # Get industry-specific agents
    industry_agents = INDUSTRY_AGENTS[industry]
    agent_ids = get_industry_agent_ids(industry)
    
    # Add industry-specific agent info
    for agent_id, config in industry_agents.items():
        result[agent_id] = {
            "name": config["name"],
            "color": config["color"]
        }
    
    # Remove replaced base agents
    if "finance" in result and agent_ids[5] != "finance":
        del result["finance"]
    if "risk" in result and agent_ids[6] != "risk":
        del result["risk"]
    
    return result
