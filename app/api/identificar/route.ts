import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import {
  identificacionDemo,
  SYSTEM_IDENTIFICAR,
  type Identificacion,
} from "@/lib/identify";

export const runtime = "nodejs";

const MODELO = process.env.CLAUDE_MODEL || "claude-sonnet-4-6";

type MediaType = "image/jpeg" | "image/png" | "image/webp" | "image/gif";

function parseDataUrl(dataUrl: string): { mediaType: MediaType; base64: string } | null {
  const m = /^data:(image\/(?:jpeg|jpg|png|webp|gif));base64,(.+)$/i.exec(dataUrl);
  if (!m) return null;
  let mt = m[1].toLowerCase();
  if (mt === "image/jpg") mt = "image/jpeg";
  return { mediaType: mt as MediaType, base64: m[2] };
}

export async function POST(req: NextRequest) {
  let imagen: string | undefined;
  try {
    const body = await req.json();
    imagen = body?.imagen;
  } catch {
    /* ignore */
  }

  // Sin API key -> modo demo (la app sigue funcionando).
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(identificacionDemo());
  }

  const parsed = imagen ? parseDataUrl(imagen) : null;
  if (!parsed) {
    return NextResponse.json({ error: "Imagen inválida" }, { status: 400 });
  }

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const resp = await client.messages.create({
      model: MODELO,
      max_tokens: 600,
      system: SYSTEM_IDENTIFICAR,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: parsed.mediaType,
                data: parsed.base64,
              },
            },
            { type: "text", text: "Identifica este producto y sugiere precios." },
          ],
        },
      ],
    });

    const texto = resp.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();

    // Tolera que el modelo envuelva el JSON en ```; extrae el primer objeto.
    const jsonStr = texto.replace(/```json|```/g, "").trim();
    const inicio = jsonStr.indexOf("{");
    const fin = jsonStr.lastIndexOf("}");
    const data = JSON.parse(jsonStr.slice(inicio, fin + 1)) as Identificacion;

    return NextResponse.json({ ...data, demo: false });
  } catch (e) {
    // Si algo falla con la IA, no rompemos la experiencia: devolvemos demo.
    console.error("Error identificando con Claude:", e);
    return NextResponse.json(identificacionDemo());
  }
}
