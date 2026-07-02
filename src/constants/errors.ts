export const ERROR_MESSAGES: Record<number, string> = {
  400: 'Invalid input. Please check your details and try again.',
  401: 'Session expired. Please log in again.',
  403: 'You do not have permission to perform this action.',
  404: 'The requested resource was not found.',
  409: 'This record already exists.',
  429: 'Too many requests. Please try again later.',
  500: 'Our servers are experiencing issues. Please try again later.',
  502: 'Bad gateway. Our services are temporarily down.',
  503: 'Service unavailable. We are currently performing maintenance.',
};

export const DEFAULT_ERROR_MESSAGE = 'An unexpected error occurred. Please try again.';
