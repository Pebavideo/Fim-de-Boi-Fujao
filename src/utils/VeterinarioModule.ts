export function formatCrmv(value: string): string {
  value = value.toUpperCase().replace(/[^A-Z0-9]/g, '');

  if (value.startsWith('CRMV')) {
    value = value.replace('CRMV', '');
  }

  if (value.length <= 2) {
    return `CRMV/${value}`;
  }

  return `CRMV/${value.slice(0, 2)}${value.slice(2, 10)}`;
}

export function formatSisbov(value: string): string {
  return value.replace(/\D/g, '').slice(0, 15);
}

export function formatTrackingTechnology(animal: any): string {
  const raw = animal?.tecnologiaRastreamento ?? animal?.tecnologia ?? '';
  const normalized = String(raw || '').trim();
  if (!normalized) return 'Visual';
  const value = normalized.toLowerCase();
  if (value.includes('gps')) return 'GPS';
  if (value.includes('4g')) return '4G';
  if (value.includes('wi-fi') || value.includes('wifi') || value.includes('wi')) return 'Wi-Fi';
  return 'Visual';
}

export function isValidCrmv(value: string): boolean {
  const crmvRegex = /^CRMV\/[A-Z]{2}[0-9]+$/;
  return crmvRegex.test(value);
}

export function buildLoteCertificadoData(
  nomeFazenda: string,
  nomeResponsavelTecnico: string,
  crmv: string,
  gta: string,
  confirmacaoSanitaria: boolean
) {
  return {
    nomeFazenda,
    nomeResponsavelTecnico,
    crmv,
    gta,
    confirmacaoSanitaria,
    dataAssinatura: new Date(),
    assinaturaEletronica: nomeResponsavelTecnico,
    status: 'CERTIFICADO'
  };
}

export function getAnimalSisbov(animal: any, sisbovMap: Record<string, string>): string {
  return sisbovMap[animal.id] || animal.sisbov || '';
}
