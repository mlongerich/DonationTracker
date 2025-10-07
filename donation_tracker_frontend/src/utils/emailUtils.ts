export const shouldDisplayEmail = (email: string): boolean => {
  return !email.toLowerCase().endsWith('@mailinator.com');
};
