export const errorMessage = (error: unknown): string => error instanceof Error ? error.message : 'İşlem sırasında beklenmeyen bir hata oluştu.';
