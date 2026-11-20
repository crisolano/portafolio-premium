// Cloudflare Pages Function: answers POST /api/chat. The logic lives in server/chat.ts.
import { handleChat, type Env } from '../../server/chat'

export const onRequest = (context: { request: Request; env: Env }) => handleChat(context.request, context.env)
