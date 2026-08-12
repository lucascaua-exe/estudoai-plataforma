"""Parser de questões no formato das apostilas IMPAR."""
from __future__ import annotations

import hashlib
import re
from dataclasses import dataclass

from apps.catalog.taxonomy import canonicalize_disciplina, normalize_assunto


DIFF_MAP = {
    "FÁCIL": "facil",
    "FACIL": "facil",
    "MÉDIO": "medio",
    "MEDIO": "medio",
    "DIFÍCIL": "dificil",
    "DIFICIL": "dificil",
}


@dataclass
class ParsedAlternative:
    letra: str
    texto: str


@dataclass
class ParsedQuestion:
    numero: int
    enunciado: str
    alternativas: list[ParsedAlternative]
    dificuldade: str = "nao_informado"
    disciplina: str = ""
    assunto: str = ""
    pagina: int | None = None
    gabarito: str = ""
    explicacao: str = ""

    def content_hash(self) -> str:
        raw = f"{self.numero}|{self.enunciado}|{self.disciplina}|{self.assunto}"
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()


@dataclass
class ParseContext:
    disciplina: str = ""
    assunto: str = ""
    dificuldade: str = "nao_informado"
    section: str = "questions"  # questions | gabaritos
    _pending_disc_num: str | None = None


def normalize_spaces(text: str) -> str:
    """Insere espaços em colagens típicas da extração PDF e remove lixo de UI."""
    if not text:
        return ""
    from apps.questions.text_cleanup import clean_study_text

    text = clean_study_text(text)
    # Corrigir padrões conhecidos adicionais do edital
    replacements = [
        (r"QuestõesFáceis", "Questões Fáceis"),
        (r"QuestoesFaceis", "Questões Fáceis"),
        (r"QuestõesdeNívelMédio", "Questões de Nível Médio"),
        (r"QuestoesdeNivelMedio", "Questões de Nível Médio"),
        (r"QuestõesDifíceis", "Questões Difíceis"),
        (r"QuestoesDificeis", "Questões Difíceis"),
        (r"GabaritoseComentários", "Gabaritos e Comentários"),
        (r"Gabaritos e Comentarios", "Gabaritos e Comentários"),
        (r"ResoluçãodaQuestão", "Resolução da Questão"),
        (r"ResolucaodaQuestao", "Resolução da Questão"),
        (r"Aalternativacorretaéa", "A alternativa correta é a"),
        (r"TecnologiadaInformacao", "Tecnologia da Informação"),
        (r"LinguaPortuguesa", "Língua Portuguesa"),
        (r"Legislacao", "Legislação"),
    ]
    for pat, repl in replacements:
        text = re.sub(pat, repl, text, flags=re.IGNORECASE)
    return text.strip()


def _is_toc_line(raw: str) -> bool:
    if re.search(r"\.\s*\.\s*\.", raw):  # spaced or tight dots
        return True
    if "…" in raw or "..." in raw:
        return True
    if re.search(r"\d{2,4}\s*$", raw) and re.search(r"\.\s*\.", raw):
        return True
    if re.search(r"^SUM[AÁ]RIO", raw, re.I):
        return True
    if re.search(r"Como\s*Usar\s*Esta", raw, re.I):
        return True
    return False


def _detect_headers(line: str, ctx: ParseContext) -> bool:
    raw = normalize_spaces(line)
    compact = re.sub(r"\s+", "", raw)

    if _is_toc_line(raw):
        return True
    if re.match(r"^\d+/\d+$", raw):
        return True

    # Gabaritos
    if re.search(r"Gabaritose?Coment", compact, re.I) or re.search(
        r"Gabaritos\s+e\s+Coment", raw, re.I
    ):
        ctx.section = "gabaritos"
        return True

    # Dificuldade sections
    if re.search(r"Quest(?:ões|oes)\s*F[aá]ceis", raw, re.I) or "QuestoesFaceis" in compact:
        ctx.dificuldade = "facil"
        ctx.section = "questions"
        return True
    if re.search(r"N[ií]vel\s*M[eé]dio", raw, re.I) or "NivelMedio" in compact:
        ctx.dificuldade = "medio"
        ctx.section = "questions"
        return True
    if re.search(r"Quest(?:ões|oes)\s*Dif[ií]ceis", raw, re.I) or "QuestoesDificeis" in compact:
        ctx.dificuldade = "dificil"
        ctx.section = "questions"
        return True

    if re.match(r"^\d+\.\d+\.\d+", raw):
        return True

    # Breadcrumb: "1.Legislacao 1.1.LeiNº..."
    m_bc = re.match(
        r"^(\d+)\.([A-Za-zÁÉÍÓÚÂÊÔÃÕÇáéíóúâêôãõç][^\d]{2,40})\s+(\d+\.\d+)\.(.+)$",
        raw,
        re.I,
    )
    if m_bc:
        canon = canonicalize_disciplina(m_bc.group(2))
        if canon:
            ctx.disciplina = canon
        assunto = normalize_assunto(m_bc.group(4))
        if assunto and len(assunto) > 3:
            ctx.assunto = assunto
        return True

    # Assunto: 1.1 Something
    m_ass = re.match(r"^(\d+\.\d+)\s+(.+)$", raw)
    if m_ass:
        assunto = m_ass.group(2).strip()
        if not re.search(r"Quest(?:ões|oes)|Gabarito|Guia|SUM", assunto, re.I):
            ctx.assunto = normalize_assunto(assunto)
            return True

    # Disciplina on same line: "1 LEGISLACAO"
    m_disc = re.match(r"^(\d+)\s+([A-Za-zÁÉÍÓÚÂÊÔÃÕÇáéíóúâêôãõç].{2,90})$", raw)
    if m_disc:
        name = m_disc.group(2).strip()
        if not re.search(r"Quest(?:ão|ões|oes)|Gabarito|Resolu|Guia|SUM", name, re.I):
            canon = canonicalize_disciplina(name)
            if canon:
                ctx.disciplina = canon
            return True

    # Standalone number chapter marker "1" — wait for next line via pending
    if re.match(r"^\d{1,2}$", raw):
        ctx._pending_disc_num = raw  # type: ignore[attr-defined]
        return True

    # Standalone ALLCAPS / Title discipline after number
    if re.match(r"^[A-ZÁÉÍÓÚÂÊÔÃÕÇ][A-Za-zÁÉÍÓÚÂÊÔÃÕÇáéíóúâêôãõç\s\-]{3,70}$", raw):
        if not re.search(r"Quest|Gabarito|Resolu|Sum[aá]rio|Guia|LIGHT|EYE", raw, re.I):
            if raw.isupper() or getattr(ctx, "_pending_disc_num", None):
                canon = canonicalize_disciplina(raw)
                if canon:
                    ctx.disciplina = canon
                ctx._pending_disc_num = None  # type: ignore[attr-defined]
                return True

    return False


QUESTION_START = re.compile(
    r"^Quest[aã]o\s*(\d+)\b",
    re.IGNORECASE,
)
RESOLUTION_START = re.compile(
    r"^Resolu[cç][aã]o\s*da\s*Quest[aã]o\s*(\d+)\b",
    re.IGNORECASE,
)
ALT_LINE = re.compile(r"^([A-E])\s+(.+)$", re.DOTALL)
GABARITO_LETTER = re.compile(
    r"alternativa\s+correta\s+[eé]\s+a\s+([A-E])\b",
    re.IGNORECASE,
)
INLINE_DIFF = re.compile(r"\b(F[ÁA]CIL|M[ÉE]DIO|DIF[ÍI]CIL)\b", re.IGNORECASE)


def parse_pages(pages: list[tuple[int, str]]) -> list[ParsedQuestion]:
    """
    pages: list of (page_number, text)
    Returns list of ParsedQuestion with gabarito/explicacao when found.
    """
    ctx = ParseContext()
    questions: dict[tuple[str, str, int], ParsedQuestion] = {}
    order_keys: list[tuple[str, str, int]] = []

    current_q: ParsedQuestion | None = None
    current_res_num: int | None = None
    current_res_lines: list[str] = []
    current_res_meta = ("", "")  # disciplina, assunto at start of resolution

    def flush_resolution():
        nonlocal current_res_num, current_res_lines, current_res_meta
        if current_res_num is None:
            return
        text = "\n".join(current_res_lines)
        letter_match = GABARITO_LETTER.search(text)
        letter = letter_match.group(1).upper() if letter_match else ""
        # Find matching question by number + context
        key = (current_res_meta[0], current_res_meta[1], current_res_num)
        q = questions.get(key)
        if not q:
            # fallback: last question with same number
            for k in reversed(order_keys):
                if k[2] == current_res_num:
                    q = questions[k]
                    break
        if q:
            if letter:
                q.gabarito = letter
            q.explicacao = normalize_spaces(text)
        current_res_num = None
        current_res_lines = []

    def flush_question():
        nonlocal current_q
        if not current_q:
            return
        # clean enunciado: remove leading difficulty/theme noise lines already parsed
        current_q.enunciado = normalize_spaces(current_q.enunciado)
        # ensure alternativas sorted
        current_q.alternativas.sort(key=lambda a: a.letra)
        key = (current_q.disciplina, current_q.assunto, current_q.numero)
        if key not in questions:
            questions[key] = current_q
            order_keys.append(key)
        else:
            # merge if we got more alternatives later
            existing = questions[key]
            if len(current_q.alternativas) > len(existing.alternativas):
                existing.alternativas = current_q.alternativas
            if not existing.enunciado and current_q.enunciado:
                existing.enunciado = current_q.enunciado
        current_q = None

    for page_num, raw_text in pages:
        text = normalize_spaces(raw_text or "")
        if not text.strip():
            continue
        # Skip pure TOC pages and guide pages
        if text.upper().count("SUM") and text.count(". .") > 8:
            continue
        if text.count(". .") > 15:
            continue
        if re.search(r"GUIA\s*R[ÁA]PIDO|Anatomia de uma quest", text, re.I):
            continue
        lines = text.split("\n")
        i = 0
        while i < len(lines):
            line = lines[i].strip()
            if not line:
                i += 1
                continue

            # Always detect structural headers (even mid-question) — flush open blocks
            raw_h = normalize_spaces(line)
            compact_h = re.sub(r"\s+", "", raw_h)
            is_struct = bool(
                re.search(r"Quest(?:ões|oes)\s*F[aá]ceis|N[ií]vel\s*M[eé]dio|Quest(?:ões|oes)\s*Dif", raw_h, re.I)
                or "QuestoesFaceis" in compact_h
                or re.search(r"Gabaritose?Coment|Gabaritos\s+e\s+Coment", compact_h + raw_h, re.I)
                or re.match(r"^\d+\.\d+\s+\S", raw_h)
                or re.match(r"^\d{1,2}$", raw_h)
                or (
                    re.match(r"^[A-ZÁÉÍÓÚÂÊÔÃÕÇ][A-ZÁÉÍÓÚÂÊÔÃÕÇ\s\-]{4,60}$", raw_h)
                    and not re.search(r"QUEST|FÁCIL|FACIL|MEDIO|DIFICIL|GABARITO|LIGHT", raw_h, re.I)
                )
            )
            if is_struct and (current_q or current_res_num is not None):
                flush_question()
                flush_resolution()

            if current_q is None and current_res_num is None:
                if _detect_headers(line, ctx):
                    i += 1
                    continue

            # Resolution block
            m_res = RESOLUTION_START.match(re.sub(r"\s+", " ", line))
            if not m_res:
                # also match compacted "ResolucaodaQuestao1"
                m_res = re.match(
                    r"Resolu[cç][aã]odaQuest[aã]o\s*(\d+)",
                    re.sub(r"\s+", "", line),
                    re.I,
                )
                if m_res:
                    # rebuild match-like
                    class _M:
                        def group(self, n):
                            return m_res.group(n)  # type: ignore

                    m_res = _M()

            if m_res or re.match(r"Resolu[cç][aã]o\s*da\s*Quest", line, re.I):
                flush_question()
                flush_resolution()
                num_m = re.search(r"(\d+)", line)
                if num_m:
                    current_res_num = int(num_m.group(1))
                    current_res_lines = [line]
                    current_res_meta = (ctx.disciplina, ctx.assunto)
                    ctx.section = "gabaritos"
                i += 1
                continue

            if current_res_num is not None:
                # stop resolution if new question starts
                if QUESTION_START.match(line) or re.match(r"^Quest[aã]o\d+", re.sub(r"\s+", "", line), re.I):
                    flush_resolution()
                    # fall through to question handling
                else:
                    # new resolution?
                    if re.match(r"Resolu[cç][aã]o", line, re.I) and re.search(r"\d+", line):
                        flush_resolution()
                        num_m = re.search(r"(\d+)", line)
                        current_res_num = int(num_m.group(1)) if num_m else None
                        current_res_lines = [line]
                        current_res_meta = (ctx.disciplina, ctx.assunto)
                    else:
                        current_res_lines.append(line)
                    i += 1
                    continue

            # Question start
            m_q = QUESTION_START.match(line)
            if not m_q:
                compact = re.sub(r"\s+", "", line)
                m_q2 = re.match(r"Quest[aã]o(\d+)", compact, re.I)
                if m_q2:
                    class _MQ:
                        def group(self, n):
                            return m_q2.group(n)

                    m_q = _MQ()

            if m_q:
                flush_question()
                numero = int(m_q.group(1))
                dificuldade = ctx.dificuldade
                # peek next lines for difficulty marker
                peek = " ".join(lines[i : i + 3])
                dm = INLINE_DIFF.search(peek)
                if dm:
                    dificuldade = DIFF_MAP.get(dm.group(1).upper(), dificuldade)
                current_q = ParsedQuestion(
                    numero=numero,
                    enunciado="",
                    alternativas=[],
                    dificuldade=dificuldade,
                    disciplina=ctx.disciplina,
                    assunto=ctx.assunto,
                    pagina=page_num,
                )
                i += 1
                # skip meta lines like "1 ○○○ FÁCIL" and theme title uppercase
                while i < len(lines):
                    nxt = lines[i].strip()
                    if not nxt:
                        i += 1
                        continue
                    if INLINE_DIFF.search(nxt) and len(nxt) < 40:
                        i += 1
                        continue
                    if re.match(r"^\d+\s*[○oOº°\s]*$", nxt):
                        i += 1
                        continue
                    if nxt.isupper() and len(nxt) < 120 and not ALT_LINE.match(nxt):
                        # theme line — skip
                        i += 1
                        continue
                    break
                continue

            if current_q is not None:
                m_alt = ALT_LINE.match(line)
                if m_alt:
                    letra = m_alt.group(1).upper()
                    texto = m_alt.group(2).strip()
                    # accumulate continuation lines until next alt or end markers
                    i += 1
                    while i < len(lines):
                        cont = lines[i].strip()
                        if not cont:
                            i += 1
                            continue
                        if ALT_LINE.match(cont) or QUESTION_START.match(cont):
                            break
                        if re.match(r"LIGHTBULB|EYE|BOOKMARK|ARROW", cont, re.I):
                            break
                        if RESOLUTION_START.match(cont) or re.match(r"Resolu[cç][aã]o", cont, re.I):
                            break
                        if re.match(r"^\d+/\d+$", cont):
                            break
                        # new structural header ends alternatives
                        if re.match(r"^[A-ZÁÉÍÓÚÂÊÔÃÕÇ]{5,40}$", cont):
                            break
                        texto += " " + cont
                        i += 1
                    current_q.alternativas.append(
                        ParsedAlternative(letra=letra, texto=normalize_spaces(texto))
                    )
                    continue

                # ignore UI chrome
                if re.match(r"LIGHTBULB|EYE|BOOKMARK|ARROW|Tente|VER GABARITO", line, re.I):
                    i += 1
                    continue
                if re.match(r"^\d+/\d+$", line):
                    i += 1
                    continue
                # enunciado accumulation
                if not ALT_LINE.match(line):
                    if current_q.enunciado:
                        current_q.enunciado += " " + line
                    else:
                        current_q.enunciado = line
                i += 1
                continue

            i += 1

    flush_question()
    flush_resolution()

    result = [questions[k] for k in order_keys]
    # Mark correct alternatives conceptually via gabarito letter (done at persist time)
    return [q for q in result if q.enunciado and len(q.alternativas) >= 2]
