import { signOut } from 'firebase/auth';
import { auth } from '../firebase/config';

export const logoutSeguro = async () => {
  try {
    await signOut(auth);
    // Limpar localStorage explicitamente para garantir que não haja dados sujos
    localStorage.clear();
  } catch (error) {
    console.error('Erro ao fazer logout:', error);
    throw error;
  }
};
