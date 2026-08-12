"""Limpeza de textos extraídos de PDF (ícones UI, lixo de layout, encoding)."""
from __future__ import annotations

import re
import unicodedata

_ICON_RE = re.compile(
    r"\b(?:"
    r"Check-Circle|Check-Square|Chevron-right|Chevron-left|Chevron-down|Chevron-up|"
    r"LIST-UL|LIST-OL|BOOKMARK|Brain|Star|Warning|"
    r"Caret-right|Caret-down"
    r")\b",
    re.IGNORECASE,
)

_ALT_MARK_RE = re.compile(r"\b(?:Times|Check)\s+(?=\([A-Ea-e]\))", re.IGNORECASE)

_RESOLUCAO_RE = re.compile(
    r"(?im)^\s*Resolu[cç][aã]o\s+da\s+Quest[aã]o\s*\d+\s*$"
)
_GABARITO_LINE_RE = re.compile(
    r"(?im)^\s*\d+\s*(?:Check-Circle\s+)?GABARITO\s*$"
)
_GABARITO_INLINE_RE = re.compile(
    r"(?i)\b\d+\s+(?:Check-Circle\s+)?GABARITO\b"
)

_LGPD_LINE_RE = re.compile(
    r"(?im)^LEI\s*N[º°\.]*\s*13\.?\s*709\s*/?\s*2018"
    r"[^\n]{0,200}?\(?\s*LGPD\s*\)?\s*"
)

_TRAILING_TOC_RE = re.compile(
    r"(?is)\s*\d+\.\s*Legisla[cç][aã]o\s+\d+\.\d+\.Lei.*$"
)

_PHRASE_FIXES = [
    (re.compile(r"An[aá]liseDetalhadadasAlternativas", re.I), "Análise Detalhada das Alternativas"),
    (re.compile(r"PontosdeAten[cç][aã]oparaProvas", re.I), "Pontos de Atenção para Provas"),
    (re.compile(r"ParaaMemorizar|ParaMemorizar", re.I), "Para Memorizar"),
    (re.compile(r"ChecklistdeRevis[aã]o", re.I), "Checklist de Revisão"),
    (re.compile(r"Aalternativa\s*correta\s*[eé]\s*a", re.I), "A alternativa correta é a"),
    (re.compile(r"GerenciamentodePacoteseReposit[oó]rios", re.I), "Gerenciamento de Pacotes e Repositórios"),
    (re.compile(r"SistemasOperacionais", re.I), "Sistemas Operacionais"),
    (re.compile(r"WindowsServere", re.I), "Windows Server e"),
    (re.compile(r"TecnologiadaInforma[cç][aã]o", re.I), "Tecnologia da Informação"),
    (re.compile(r"LinguaPortuguesa|L[ií]nguaPortuguesa", re.I), "Língua Portuguesa"),
    (re.compile(r"GerenciamentodeCache", re.I), "Gerenciamento de Cache"),
    (re.compile(r"Reposit[oó]rioseChaves", re.I), "Repositórios e Chaves"),
    (re.compile(r"ComandosdeInforma[cç][aã]o", re.I), "Comandos de Informação"),
    (re.compile(r"OOperador", re.I), "O Operador"),
    (re.compile(r"Nocontexto", re.I), "No contexto"),
    (re.compile(r"osagentes", re.I), "os agentes"),
    (re.compile(r"detratamento", re.I), "de tratamento"),
    (re.compile(r"(?<![a-zà-ú])dedados(?![a-zà-ú])", re.I), "de dados"),
    (re.compile(r"dapessoa", re.I), "da pessoa"),
    (re.compile(r"Geralde\s*Prote", re.I), "Geral de Prote"),
    (re.compile(r"Proteçãode", re.I), "Proteção de"),
    (re.compile(r"definidopela", re.I), "definido pela"),
    (re.compile(r"comoapessoa", re.I), "como a pessoa"),
    (re.compile(r"naturaloujurídica|naturaloujuridica", re.I), "natural ou jurídica"),
    (re.compile(r"dedireito", re.I), "de direito"),
    (re.compile(r"públicoou|publicoou", re.I), "público ou"),
    (re.compile(r"desempenhampapeis|desempenhampapéis", re.I), "desempenham papéis"),
    (re.compile(r"contextoda", re.I), "contexto da"),
    (re.compile(r"agentesde", re.I), "agentes de"),
    (re.compile(r"tratamentode", re.I), "tratamento de"),
    (re.compile(r"dedadosdesempenham", re.I), "de dados desempenham"),
    (re.compile(r"(?<![a-zà-ú])dedados(?![a-zà-ú])", re.I), "de dados"),
    (re.compile(r"papéisdistintos|papeisdistintos", re.I), "papéis distintos"),
    (re.compile(r"LGPDcomo", re.I), "LGPD como"),
    (re.compile(r"pessoanatural", re.I), "pessoa natural"),
    (re.compile(r"direitop[uú]blico", re.I), "direito público"),
    (re.compile(r"Operador[eé]", re.I), "Operador é"),
    (re.compile(r"[eé]definido", re.I), "é definido"),
    (re.compile(r"LGPD,\s*", re.I), "LGPD, "),
]

_BAD_SPACE_RE = re.compile(r"[\u00a0\u1680\u2000-\u200a\u202f\u205f\u3000]")
_ZERO_WIDTH_RE = re.compile(r"[\u200b-\u200f\u2028\u2029\u2060\ufeff\u00ad]")
_CTRL_RE = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f]")
_CAMEL_RE = re.compile(r"([a-zà-öø-ÿãõâêôç])([A-Z])")
_MULTI_NL_RE = re.compile(r"\n{3,}")
_MULTI_SPACE_RE = re.compile(r"[ \t]{2,}")


def _fix_quotes_and_replacement(text: str) -> str:
    text = text.replace("\ufffd", "'").replace("�", "'")
    for a, b in (
        ("\u2018", "'"),
        ("\u2019", "'"),
        ("\u201c", '"'),
        ("\u201d", '"'),
        ("\u2013", "-"),
        ("\u2014", "-"),
        ("\u2026", "..."),
    ):
        text = text.replace(a, b)
    return text


def _remove_page_footers(text: str) -> str:
    def repl(m: re.Match) -> str:
        a, b = int(m.group(1)), int(m.group(2))
        if 1900 <= b <= 2100:
            return m.group(0)
        if b >= 100 and a < b:
            return ""
        return m.group(0)

    return re.sub(r"\b(\d{1,4})/(\d{2,4})\b", repl, text)


def _strip_layout_noise(text: str) -> str:
    text = _RESOLUCAO_RE.sub("", text)
    text = _GABARITO_LINE_RE.sub("", text)
    text = _GABARITO_INLINE_RE.sub("", text)
    text = _ICON_RE.sub("", text)
    text = _ALT_MARK_RE.sub("", text)
    text = _remove_page_footers(text)
    text = _LGPD_LINE_RE.sub("", text)
    text = _TRAILING_TOC_RE.sub("", text)
    return text


def _fix_glued_words(text: str) -> str:
    for pat, repl in _PHRASE_FIXES:
        text = pat.sub(repl, text)
    text = _CAMEL_RE.sub(r"\1 \2", text)
    text = re.sub(r"\bArt\.?\s*(\d)", r"Art. \1", text, flags=re.I)
    text = re.sub(r"\bN[º°]\s*", "Nº ", text)
    text = re.sub(r"\bN\.\s*(?=\d)", "Nº ", text)
    return text


def _normalize_base(text: str) -> str:
    text = unicodedata.normalize("NFC", text or "")
    text = _fix_quotes_and_replacement(text)
    text = _BAD_SPACE_RE.sub(" ", text)
    text = _ZERO_WIDTH_RE.sub("", text)
    text = _CTRL_RE.sub("", text)
    return text.replace("\r\n", "\n").replace("\r", "\n")


def _finalize(text: str) -> str:
    lines = [_MULTI_SPACE_RE.sub(" ", ln).strip() for ln in text.split("\n")]
    return _MULTI_NL_RE.sub("\n\n", "\n".join(lines)).strip()


def _mild_clean(text: str) -> str:
    text = _normalize_base(text)
    text = _RESOLUCAO_RE.sub("", text)
    text = _GABARITO_LINE_RE.sub("", text)
    text = _GABARITO_INLINE_RE.sub("", text)
    text = _ICON_RE.sub("", text)
    text = _ALT_MARK_RE.sub("", text)
    text = _remove_page_footers(text)
    text = _LGPD_LINE_RE.sub("", text)
    text = _TRAILING_TOC_RE.sub("", text)
    text = _fix_glued_words(text)
    return _finalize(text)


def clean_study_text(text: str | None) -> str:
    if not text:
        return ""
    text = _normalize_base(text)
    text = _strip_layout_noise(text)
    text = _fix_glued_words(text)
    text = _LGPD_LINE_RE.sub("", text)
    text = _TRAILING_TOC_RE.sub("", text)
    text = _remove_page_footers(text)
    return _finalize(text)


def clean_enunciado(text: str | None) -> str:
    original = text or ""
    cleaned = clean_study_text(original)
    cleaned = re.sub(r"(?is)\n?Análise Detalhada das Alternativas.*$", "", cleaned).strip()
    cleaned = _TRAILING_TOC_RE.sub("", cleaned).strip()
    if len(cleaned) < 30 and len(original) >= 30:
        cleaned = _mild_clean(original)
        cleaned = re.sub(r"(?is)\n?Análise Detalhada das Alternativas.*$", "", cleaned).strip()
        cleaned = _TRAILING_TOC_RE.sub("", cleaned).strip()
    return cleaned


_SECTION_ANY_RE = re.compile(
    r"(?im)(?:(?<=[.!?])\s*|(?<=\n)\s*|(?<=:)\s+|(?<=\s)|(?<=^))"
    r"(Resposta correta|Alternativa correta|"
    r"Por que(?: as outras(?: alternativas?)?(?: falham)?)?|"
    r"Alternativas? incorretas?|"
    r"Análise(?: detalhada)?(?: das alternativas)?|"
    r"Dica(?: de memorização)?|Para memorizar)\s*:"
)

_MD_FENCE_RE = re.compile(r"```(?:\w+)?\s*|\s*```")
_MD_BOLD_HEADING_RE = re.compile(
    r"(?im)^\s*\*\*(Resposta correta|Alternativa correta|Por que[^:*]{0,40}|Alternativas? incorretas?|Dica[^:*]{0,40}|Para memorizar)\*\*\s*:?\s*$"
)
_BULLET_INLINE_RE = re.compile(r"\s+[-*•]\s+(?=[A-Ea-e]\))")


def format_explicacao(text: str | None) -> str:
    """Normaliza estrutura da resolução para exibição limpa no frontend."""
    if not text:
        return ""
    cleaned = clean_study_text(text)
    cleaned = _MD_FENCE_RE.sub("", cleaned)
    cleaned = _MD_BOLD_HEADING_RE.sub(lambda m: f"{m.group(1)}:", cleaned)
    cleaned = re.sub(
        r"(?i)\*\*(Resposta correta|Alternativa correta|Por que[^:*]{0,40}|Alternativas? incorretas?|Dica[^:*]{0,40}|Para memorizar)\s*:?\*\*\s*:?",
        r"\1:",
        cleaned,
    )
    cleaned = re.sub(r"(?m)^\s*#{1,3}\s+", "", cleaned)
    cleaned = _SECTION_ANY_RE.sub(r"\n\n\1:\n", cleaned)
    cleaned = _BULLET_INLINE_RE.sub("\n• ", cleaned)
    cleaned = re.sub(r"(?m)^\s*[-*]\s+", "• ", cleaned)
    cleaned = re.sub(r"[ \t]+\n", "\n", cleaned)
    cleaned = re.sub(r"\n[ \t]+", "\n", cleaned)
    return _MULTI_NL_RE.sub("\n\n", cleaned).strip()


def clean_explicacao(text: str | None) -> str:
    return format_explicacao(text)


def clean_alternativa(text: str | None) -> str:
    return clean_study_text(text)
