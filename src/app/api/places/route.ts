import { NextRequest, NextResponse } from 'next/server';

export interface PlaceSuggestion {
  placeId: string;
  mainText: string;
  secondaryText: string;
  fullText: string;
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') ?? '';
  if (q.trim().length < 2) return NextResponse.json([]);

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  // If key not configured → return empty (graceful degradation to plain input)
  if (!apiKey) return NextResponse.json([]);

  try {
    const res = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
      },
      body: JSON.stringify({
        input: q.trim(),
        languageCode: 'it',
        includedRegionCodes: ['it'],
      }),
    });

    if (!res.ok) return NextResponse.json([]);

    const data = await res.json();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const suggestions: PlaceSuggestion[] = (data.suggestions ?? [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((s: any): PlaceSuggestion | null => {
        const pred = s.placePrediction;
        if (!pred) return null;
        return {
          placeId: pred.placeId ?? '',
          mainText: pred.structuredFormat?.mainText?.text ?? pred.text?.text ?? '',
          secondaryText: pred.structuredFormat?.secondaryText?.text ?? '',
          fullText: pred.text?.text ?? '',
        };
      })
      .filter((x: PlaceSuggestion | null): x is PlaceSuggestion => x !== null && x.placeId !== '')
      .slice(0, 5);

    return NextResponse.json(suggestions);
  } catch {
    return NextResponse.json([]);
  }
}
