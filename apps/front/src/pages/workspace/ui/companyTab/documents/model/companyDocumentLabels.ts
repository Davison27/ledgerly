const TYPE_LABEL_KEY_BY_CODE: Record<string, string> = {
  civil_liability_policy: 'civil_liability_policy',
  civil_liability_payment: 'civil_liability_payment',
  occupational_risk_prevention: 'occupational_risk_prevention',
  risk_assessment: 'risk_assessment',
  risk_planning: 'risk_planning',
  preventive_resource: 'preventive_resource',
  tax_debt_certificate: 'tax_debt_certificate',
  social_security_debt_certificate: 'social_security_debt_certificate',
  bank_account_ownership_certificate: 'bank_account_ownership_certificate',
  poliza_responsabilidad_civil: 'civil_liability_policy',
  pago_responsabilidad_civil: 'civil_liability_payment',
  recibo_responsabilidad_civil: 'civil_liability_payment',
  recibo_seguro_responsabilidad_civil: 'civil_liability_payment',
  prevencion_riesgos_laborales: 'occupational_risk_prevention',
  evaluacion_riesgos: 'risk_assessment',
  planificacion_riesgos: 'risk_planning',
  planificacion_preventiva: 'risk_planning',
  recurso_preventivo: 'preventive_resource',
  certificado_deuda_tributaria: 'tax_debt_certificate',
  deuda_tributaria: 'tax_debt_certificate',
  certificado_deuda_seguridad_social: 'social_security_debt_certificate',
  deuda_seguridad_social: 'social_security_debt_certificate',
  certificado_titularidad_cuenta_bancaria: 'bank_account_ownership_certificate',
  titularidad_cuenta_bancaria: 'bank_account_ownership_certificate',
};

export function companyDocumentTypeTranslationKey(code: string): string {
  const normalizedCode = code.trim().toLocaleLowerCase().replace(/[\s-]+/g, '_');
  return TYPE_LABEL_KEY_BY_CODE[normalizedCode] ?? code;
}
