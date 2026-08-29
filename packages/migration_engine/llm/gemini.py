"""Google Gemini LLM Provider implementation for bounded code migrations."""

from __future__ import annotations

import os
import json
from typing import Any, List, Optional

from packages.change_engine.models import APIChange
from .base import LLMProvider


class GeminiLLMProvider(LLMProvider):
    """LLM Provider powered by Google Gemini (gemini-2.5-flash / gemini-2.5-pro).

    Strictly enforces bounded context: only passes change metadata, target file content,
    and affected symbol signatures. Never leaks whole repository context.
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        model_name: str = "gemini-2.5-flash",
    ):
        self.api_key = api_key or os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
        self.model_name = model_name
        self._client = None

        if self.api_key:
            try:
                import google.generativeai as genai
                genai.configure(api_key=self.api_key)
                self._client = genai.GenerativeModel(self.model_name)
            except Exception as e:
                print(f"[GeminiLLMProvider] Warning: failed to configure google.generativeai: {e}")

    def is_available(self) -> bool:
        return self._client is not None

    def generate_plan(
        self,
        change: APIChange,
        context: dict[str, Any],
    ) -> list[str]:
        """Generate high-level step-by-step migration plan."""
        if not self._client:
            return [
                f"Review API change: {change.description}",
                "Update affected endpoints and type signatures",
                "Adjust callers to provide required parameters",
                "Update unit tests to reflect new API contracts",
            ]

        prompt = f"""You are an expert software engineer performing an automated API migration.
API Provider: {context.get('provider', 'External API')}
Change Type: {change.type.value}
Breaking: {change.breaking}
Description: {change.description}
Affected Files: {json.dumps(context.get('affected_files', []))}

Generate a concise, 3 to 5 step actionable migration plan as a raw JSON array of strings.
Example output format:
["Step 1 description", "Step 2 description", "Step 3 description"]
Output ONLY valid JSON, nothing else."""

        try:
            response = self._client.generate_content(prompt)
            text = response.text.strip()
            if text.startswith("```json"):
                text = text[7:]
            if text.startswith("```"):
                text = text[3:]
            if text.endswith("```"):
                text = text[:-3]
            plan = json.loads(text.strip())
            if isinstance(plan, list):
                return [str(s) for s in plan]
        except Exception as e:
            print(f"[GeminiLLMProvider] Plan generation fallback: {e}")

        return [
            f"Update {change.old_path or 'endpoint'} to {change.new_path or 'new version'}",
            f"Adjust callers to satisfy {change.description}",
            "Verify syntax and unit test assertions",
        ]

    def generate_patch(
        self,
        file_path: str,
        original_content: str,
        change: APIChange,
        context: dict[str, Any],
    ) -> str:
        """Generate patched file contents for a specific affected file."""
        if not self._client:
            return original_content

        prompt = f"""You are an automated code migration assistant.
Apply the following external API change to the provided file content.

API Change:
- Description: {change.description}
- Type: {change.type.value}
- Old Value: {change.old_path or change.field or 'N/A'}
- New Value: {change.new_path or (change.field + ' is required') if change.field else 'N/A'}

File to modify: {file_path}

Current Content:
```
{original_content}
```

Instructions:
1. Return ONLY the complete updated file content.
2. Do NOT add markdown code fence wrappers or introductory commentary.
3. Preserve existing code structure, comments, and style.
4. Only make modifications necessary to satisfy the API change."""

        try:
            response = self._client.generate_content(prompt)
            result = response.text
            # Strip accidental markdown code blocks if present
            if result.startswith("```"):
                lines = result.splitlines()
                if lines[0].startswith("```"):
                    lines = lines[1:]
                if lines and lines[-1].strip() == "```":
                    lines = lines[:-1]
                result = "\n".join(lines)
            return result.strip() + "\n"
        except Exception as e:
            print(f"[GeminiLLMProvider] Patch generation fallback: {e}")
            return original_content

    def explain_change(
        self,
        change: APIChange,
    ) -> str:
        """Explain why this migration is necessary and what breaking impact it carries."""
        if not self._client:
            return f"API Migration needed: {change.description} (breaking={change.breaking})"

        prompt = f"""Explain this API change in 2 sentences for an engineering PR description:
- Description: {change.description}
- Breaking: {change.breaking}
- Type: {change.type.value}
Focus on why code must be updated to prevent runtime failure."""

        try:
            response = self._client.generate_content(prompt)
            return response.text.strip()
        except Exception:
            return f"API Migration needed: {change.description} (breaking={change.breaking})"
