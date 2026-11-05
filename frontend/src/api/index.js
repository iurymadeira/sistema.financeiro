import { createApiRepository } from './apiRepository.js'

// Endereço da API. Em desenvolvimento, o back roda em 127.0.0.1:5000 (backend/.env_example).
// Na hospedagem, defina NEXT_PUBLIC_API_URL (o valor é embutido no site na hora do build).
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:5000/api'

export const repository = createApiRepository(API_URL)
