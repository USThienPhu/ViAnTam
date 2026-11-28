"""Gọi Amazon Bedrock qua boto3 converse (docs/aws-llm-service-spec.md mục 3)."""
import os

import boto3
from botocore.config import Config
from botocore.exceptions import BotoCoreError, ClientError


class LLMUnavailable(Exception):
    """Không model nào trả lời được."""


_client = None


def _get_client():
    global _client
    if _client is None:
        _client = boto3.client(
            "bedrock-runtime",
            region_name=os.getenv("AWS_REGION", "us-east-1"),
            config=Config(read_timeout=10, connect_timeout=3, retries={"max_attempts": 1}),
        )
    return _client


def _converse(model_id: str, system_prompt: str, user_prompt: str) -> str:
    response = _get_client().converse(
        modelId=model_id,
        system=[{"text": system_prompt}],
        messages=[{"role": "user", "content": [{"text": user_prompt}]}],
        inferenceConfig={"maxTokens": 1024, "temperature": 0},
    )
    return response["output"]["message"]["content"][0]["text"]


def generate(system_prompt: str, user_prompt: str) -> tuple[str, str]:
    models = [m for m in (os.getenv("BEDROCK_MODEL_ID", ""), os.getenv("BEDROCK_FALLBACK_MODEL_ID", "")) if m]
    if not models:
        raise LLMUnavailable("BEDROCK_MODEL_ID chưa được cấu hình")
    last_error = None
    for model_id in models:
        try:
            return _converse(model_id, system_prompt, user_prompt), model_id
        except (BotoCoreError, ClientError, KeyError, IndexError) as err:
            last_error = err
    raise LLMUnavailable(type(last_error).__name__)
