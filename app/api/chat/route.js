import { Pinecone } from "@pinecone-database/pinecone";
import { NextResponse } from "next/server";
import OpenAI from "openai";

const systemPrompt = `
You are an advanced AI assistant designed to help students find the best professors based on their queries. Your primary function is to use Retrieval-Augmented Generation (RAG) to provide the top 3 professors that match the user's request.

Instructions:
Understand the Query: Read and analyze the user’s question to understand their specific needs and preferences regarding professors.
Retrieve Relevant Information: Use the RAG model to retrieve information from a database of professors, including their ratings, specialties, and student feedback.
Generate a List: Based on the retrieved information, generate a list of the top 3 professors who best match the criteria specified in the user's query.
Provide Details: For each of the top 3 professors, include their name, department, a brief overview of their specialties or notable attributes, and a summary of student feedback or ratings.

Example Interaction:
User Query: "I’m looking for a professor who specializes in machine learning and has good reviews for their teaching style." Response:

Professor Jane Doe - Department of Computer Science. Specializes in machine learning and artificial intelligence. Highly rated for engaging lectures and practical assignments.
Professor John Smith - Department of Data Science. Known for his deep knowledge in machine learning and supportive teaching approach.
Professor Emily Johnson - Department of Statistics. Offers advanced courses in machine learning with a reputation for clear explanations and helpful feedback.
Notes:

Ensure that the information provided is current and accurate.
Focus on relevance to the user’s query to maximize usefulness.
Aim for clarity and conciseness in the responses.





`;

// export async function POST(req) {
//   const data = await req.json();

//   const pc = new Pinecone({
//     apiKey: process.env.PINECONE_API_KEY,
//   });

//   const index = pc.index("rag").namespace("ns1");
//   const openai = new OpenAI();

//   //   takes in the last message in our chat
//   const text = data[data.length - 1].content;
//   const embedding = await openai.embeddings.create({
//     model: "text-embedding-3-small",
//     input: text,
//     encoding_format: "float",
//   });

//   const results = await index.query({
//     topK: 3,
//     includeMetadata: true,
//     vector: embedding.data[0].embedding,
//   });

//   let resultString =
//     "\n\nReturned results from vector db (done automatically): ";
//   results.matches.forEach((match) => {
//     resultString += `\n
//       Returned Results:
//       Professor: ${match.id}
//       Review: ${match.metadata.stars}
//       Subject: ${match.metadata.subject}
//       Stars: ${match.metadata.stars}
//       \n\n`;
//   });

//   const lastMessage = data[data.length - 1];
//   const lastMessageContent = lastMessage.content + resultString;
//   const lastDataWithoutLastMessage = data.slice(0, data.length - 1);

//   const completion = await openai.chat.completions.create({
//     messages: [
//       { role: "system", content: systemPrompt },
//       ...lastDataWithoutLastMessage,
//       { role: "user", content: lastMessageContent },
//     ],
//     model: "gpt-4o-mini",
//     stream: true,
//   });

//   const stream = new ReadableStream({
//     async start(controller) {
//       const encoder = new TextEncoder();
//       try {
//         for await (const chunk of completion) {
//           const content = chunk.choices[0]?.delta?.content;
//           if (content) {
//             const text = encoder.encode(content);
//             controller.enqueue(text);
//           }
//         }
//       } catch (err) {
//         controller.error(err);
//       } finally {
//         controller.close();
//       }
//     },
//   });
//   const responseData = { content: resultString };
//   return new NextResponse(JSON.stringify(responseData), {
//     headers: { "Content-Type": "application/json" },
//   });
// }

export async function POST(req) {
  const data = await req.json();

  const pc = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY,
  });

  const index = pc.index("rag").namespace("ns1");
  const openai = new OpenAI();

  // Get the last message content
  const text = data[data.length - 1].content;
  const embedding = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
    encoding_format: "float",
  });

  const results = await index.query({
    topK: 3,
    includeMetadata: true,
    vector: embedding.data[0].embedding,
  });

  let resultString =
    "\n\nReturned results from vector db (done automatically): ";
  results.matches.forEach((match) => {
    resultString += `\n
      Returned Results:
      Professor: ${match.id}
      Review: ${match.metadata.stars}
      Subject: ${match.metadata.subject}
      Stars: ${match.metadata.stars}
      \n\n`;
  });

  const lastMessage = data[data.length - 1];
  const lastMessageContent = lastMessage.content + resultString;
  const lastDataWithoutLastMessage = data.slice(0, data.length - 1);

  const completion = await openai.chat.completions.create({
    messages: [
      { role: "system", content: "Your system prompt here" },
      ...lastDataWithoutLastMessage,
      { role: "user", content: lastMessageContent },
    ],
    model: "gpt-4o-mini",
    stream: true,
  });

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      try {
        for await (const chunk of completion) {
          const content = chunk.choices[0]?.delta?.content;
          if (content) {
            const text = encoder.encode(content);
            controller.enqueue(text);
          }
        }
      } catch (err) {
        controller.error(err);
      } finally {
        controller.close();
      }
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/plain",
    },
  });
}
