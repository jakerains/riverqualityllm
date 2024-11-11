import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import fs from 'fs'
import path from 'path'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Function to save the image
async function saveImage(base64Data: string, filename: string) {
  const buffer = Buffer.from(base64Data, 'base64')
  const filePath = path.join(process.cwd(), 'captured_images', filename)
  
  // Ensure the directory exists
  await fs.promises.mkdir(path.dirname(filePath), { recursive: true })
  
  // Write the file
  await fs.promises.writeFile(filePath, buffer)
  console.log(`Image saved: ${filePath}`)
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { image } = body

    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 })
    }

    const base64Image = image.split(',')[1] // Remove the data:image/...;base64, prefix

    if (!base64Image) {
      throw new Error('Invalid image format')
    }

    const prompt = `You are a quality control expert for decorative balls (also referred to as decorative spheres).
Analyze the provided image and respond in the following format:
STATUS: PASS, FAIL, or NO_BALL
REASON: Brief explanation (1-2 sentences max)

Important notes:
- A decorative ball/sphere is what we're looking for. These terms are interchangeable in our context.
- The ball may have intricate patterns, designs, or variations in color and material. They may be made of wood, plastic, or other materials. These materials are normal and not considered defects.
- Focus on structural integrity, not surface designs, texture, color, or material exclusively.

Example responses:
STATUS: PASS
REASON: The ball/sphere appears structurally sound with no visible cracks or deformities. Surface patterns are normal.

STATUS: FAIL
REASON: The ball/sphere has visible cracks or is not perfectly round.

STATUS: NO_BALL
REASON: There is no ball or sphere present in the image.

Analyze the image and provide your assessment:`

    const response = await openai.chat.completions.create({
      model: "gpt-4-vision-preview",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`,
              },
            },
          ],
        },
      ],
    });

    const responseText = response.choices[0].message.content;
    console.log('OpenAI Response:', responseText);

    // Improved parsing logic
    const statusMatch = responseText.match(/STATUS:\s*(PASS|FAIL|NO_BALL)/i);
    const reasonMatch = responseText.match(/REASON:\s*(.+)/i);

    let status: 'pass' | 'fail' | 'no_ball' | 'quality_error' = 'quality_error';
    let reason = 'Unable to determine ball quality.';

    if (statusMatch && reasonMatch) {
      status = statusMatch[1].toLowerCase() as 'pass' | 'fail' | 'no_ball';
      reason = reasonMatch[1].trim();
    } else {
      console.error('Unexpected response format:', responseText);
    }

    console.log('Parsed status:', status);
    console.log('Parsed reason:', reason);

    return NextResponse.json({ status, message: reason })

  } catch (error: any) {
    console.error('Error during analysis:', error)
    return NextResponse.json({ error: error.message || 'Analysis failed' }, { status: 500 })
  }
}