class ValidationService {
  isValidSymbol(symbol: string): boolean {
    // Check if symbol is 1-5 uppercase letters
    return /^[A-Z]{1,5}$/.test(symbol);
  }
  
  isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
  
  isValidUUID(uuid: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid);
  }
}

export const validationService = new ValidationService();