import { getPrisma } from '@/lib/db'
export type Language = 'en' | 'ar' | 'pt';
export type TermsType = string;

export interface TermsContent {
  version: string;
  type: TermsType;
  language: Language;
  title: string;
  content: string;
  lastUpdated: string;
}

export const CURRENT_TERMS_VERSION = "1.0.0";

// Terms content in multiple languages
export const TERMS_CONTENT: Record<Language, Record<TermsType, any>> = {
  'en': {
    TERMS_AND_CONDITIONS: {
      version: CURRENT_TERMS_VERSION,
      type: "TERMS_AND_CONDITIONS",
      language: "EN",
      title: "Terms and Conditions",
      content: `
# Terms and Conditions - LVJ Case Assistant

**Effective Date:** August 13, 2025
**Version:** ${CURRENT_TERMS_VERSION}

## 1. Acceptance of Terms
By accessing and using the LVJ Case Assistant platform, you agree to be bound by these Terms and Conditions and all applicable laws and regulations.

## 2. Services Provided
LVJ provides immigration case management services, including:
- Document collection and review
- Visa application processing assistance
- Legal consultation coordination
- Payment processing for services

## 3. User Responsibilities
- Provide accurate and complete information
- Maintain confidentiality of account credentials
- Comply with all applicable immigration laws
- Pay fees as agreed upon

## 4. Data Processing and Privacy
We process your personal data in accordance with our Privacy Policy and GDPR requirements.

## 5. Limitation of Liability
LVJ's liability is limited to the fees paid for services. We are not liable for visa application outcomes.

## 6. Termination
Either party may terminate services with 30 days written notice.

By signing below, you acknowledge that you have read, understood, and agree to be bound by these terms.
      `,
      lastUpdated: "2025-08-13"
    },
    PRIVACY_POLICY: {
      version: CURRENT_TERMS_VERSION,
      type: "PRIVACY_POLICY",
      language: "EN",
      title: "Privacy Policy",
      content: `
# Privacy Policy - LVJ Case Assistant

**Effective Date:** August 13, 2025
**Version:** ${CURRENT_TERMS_VERSION}

## 1. Data Collection
We collect personal information necessary for providing immigration services, including:
- Identity documents
- Financial information
- Contact details
- Case-related communications

## 2. Data Usage
Your data is used solely for:
- Processing your immigration case
- Communication with legal partners
- Service improvement
- Legal compliance

## 3. Data Storage
All data is stored securely in EU-region servers in compliance with GDPR.

## 4. Data Sharing
We may share your data with:
- Legal partners (with your consent)
- Government authorities (as required by law)
- Service providers (under strict confidentiality)

## 5. Your Rights
Under GDPR, you have the right to:
- Access your data
- Request corrections
- Request deletion
- Data portability
- Withdraw consent

## 6. Contact Information
For privacy concerns, contact: privacy@lvj.com
      `,
      lastUpdated: "2025-08-13"
    },
    MONITORING_CONSENT: {
      version: CURRENT_TERMS_VERSION,
      type: "MONITORING_CONSENT",
      language: "EN",
      title: "Monitoring Consent",
      content: `
# Monitoring Consent - LVJ Case Assistant

**Effective Date:** August 13, 2025
**Version:** ${CURRENT_TERMS_VERSION}

## Purpose of Monitoring
To ensure service quality and security, we monitor:
- Platform usage and performance
- Communication interactions
- Document processing activities
- User behavior for security purposes

## Data Collected
- Login activities and session data
- Feature usage patterns
- Error logs and system performance
- Communication metadata (not content)

## How We Use This Data
- Improve platform performance
- Enhance user experience
- Detect security threats
- Generate anonymous usage statistics

## Your Consent
By providing consent, you agree to our monitoring activities as described above.

## Withdrawal of Consent
You may withdraw consent at any time by contacting support@lvj.com
      `,
      lastUpdated: "2025-08-13"
    }
  },
  'ar': {
    TERMS_AND_CONDITIONS: {
      version: CURRENT_TERMS_VERSION,
      type: "TERMS_AND_CONDITIONS",
      language: "AR",
      title: "الشروط والأحكام",
      content: `
# الشروط والأحكام - مساعد قضايا LVJ

**تاريخ النفاذ:** 13 أغسطس 2025
**الإصدار:** ${CURRENT_TERMS_VERSION}

## 1. قبول الشروط
بالوصول إلى منصة مساعد قضايا LVJ واستخدامها، فإنك توافق على الالتزام بهذه الشروط والأحكام وجميع القوانين واللوائح المعمول بها.

## 2. الخدمات المقدمة
تقدم LVJ خدمات إدارة قضايا الهجرة، بما في ذلك:
- جمع الوثائق ومراجعتها
- المساعدة في معالجة طلبات التأشيرة
- تنسيق الاستشارات القانونية
- معالجة المدفوعات للخدمات

## 3. مسؤوليات المستخدم
- تقديم معلومات دقيقة وكاملة
- الحفاظ على سرية بيانات اعتماد الحساب
- الامتثال لجميع قوانين الهجرة المعمول بها
- دفع الرسوم كما هو متفق عليه

## 4. معالجة البيانات والخصوصية
نحن نعالج بياناتك الشخصية وفقاً لسياسة الخصوصية الخاصة بنا ومتطلبات اللائحة العامة لحماية البيانات.

## 5. تحديد المسؤولية
مسؤولية LVJ محدودة بالرسوم المدفوعة مقابل الخدمات. نحن لسنا مسؤولين عن نتائج طلبات التأشيرة.

## 6. الإنهاء
يجوز لأي طرف إنهاء الخدمات بإشعار كتابي مدته 30 يوماً.

بالتوقيع أدناه، فإنك تقر بأنك قد قرأت وفهمت ووافقت على الالتزام بهذه الشروط.
      `,
      lastUpdated: "2025-08-13"
    },
    PRIVACY_POLICY: {
      version: CURRENT_TERMS_VERSION,
      type: "PRIVACY_POLICY",
      language: "AR",
      title: "سياسة الخصوصية",
      content: `
# سياسة الخصوصية - مساعد قضايا LVJ

**تاريخ النفاذ:** 13 أغسطس 2025
**الإصدار:** ${CURRENT_TERMS_VERSION}

## 1. جمع البيانات
نحن نجمع المعلومات الشخصية الضرورية لتقديم خدمات الهجرة، بما في ذلك:
- وثائق الهوية
- المعلومات المالية
- تفاصيل الاتصال
- التواصل المتعلق بالقضية

## 2. استخدام البيانات
تُستخدم بياناتك فقط لـ:
- معالجة قضية الهجرة الخاصة بك
- التواصل مع الشركاء القانونيين
- تحسين الخدمة
- الامتثال القانوني

## 3. تخزين البيانات
يتم تخزين جميع البيانات بشكل آمن في خوادم منطقة الاتحاد الأوروبي امتثالاً للائحة العامة لحماية البيانات.

## 4. مشاركة البيانات
قد نشارك بياناتك مع:
- الشركاء القانونيين (بموافقتك)
- السلطات الحكومية (حسب ما يقتضيه القانون)
- مقدمي الخدمات (تحت السرية الصارمة)

## 5. حقوقك
بموجب اللائحة العامة لحماية البيانات، لديك الحق في:
- الوصول إلى بياناتك
- طلب التصحيحات
- طلب الحذف
- قابلية نقل البيانات
- سحب الموافقة

## 6. معلومات الاتصال
لمخاوف الخصوصية، اتصل بـ: privacy@lvj.com
      `,
      lastUpdated: "2025-08-13"
    },
    MONITORING_CONSENT: {
      version: CURRENT_TERMS_VERSION,
      type: "MONITORING_CONSENT", 
      language: "AR",
      title: "موافقة المراقبة",
      content: `
# موافقة المراقبة - مساعد قضايا LVJ

**تاريخ النفاذ:** 13 أغسطس 2025
**الإصدار:** ${CURRENT_TERMS_VERSION}

## الغرض من المراقبة
لضمان جودة الخدمة والأمان، نحن نراقب:
- استخدام المنصة والأداء
- تفاعلات التواصل
- أنشطة معالجة الوثائق
- سلوك المستخدم لأغراض الأمان

## البيانات المجمعة
- أنشطة تسجيل الدخول وبيانات الجلسة
- أنماط استخدام الميزات
- سجلات الأخطاء وأداء النظام
- البيانات الوصفية للتواصل (وليس المحتوى)

## كيف نستخدم هذه البيانات
- تحسين أداء المنصة
- تعزيز تجربة المستخدم
- اكتشاف التهديدات الأمنية
- إنشاء إحصائيات استخدام مجهولة

## موافقتك
بتقديم الموافقة، فإنك توافق على أنشطة المراقبة الخاصة بنا كما هو موضح أعلاه.

## سحب الموافقة
يمكنك سحب الموافقة في أي وقت عن طريق الاتصال بـ support@lvj.com
      `,
      lastUpdated: "2025-08-13"
    }
  },
  'pt': {
    TERMS_AND_CONDITIONS: {
      version: CURRENT_TERMS_VERSION,
      type: "TERMS_AND_CONDITIONS",
      language: "PT",
      title: "Termos e Condições",
      content: `
# Termos e Condições - Assistente de Casos LVJ

**Data de Vigência:** 13 de Agosto de 2025
**Versão:** ${CURRENT_TERMS_VERSION}

## 1. Aceitação dos Termos
Ao acessar e usar a plataforma Assistente de Casos LVJ, você concorda em estar vinculado a estes Termos e Condições e todas as leis e regulamentos aplicáveis.

## 2. Serviços Prestados
A LVJ fornece serviços de gestão de casos de imigração, incluindo:
- Coleta e revisão de documentos
- Assistência no processamento de pedidos de visto
- Coordenação de consultas jurídicas
- Processamento de pagamentos por serviços

## 3. Responsabilidades do Usuário
- Fornecer informações precisas e completas
- Manter a confidencialidade das credenciais da conta
- Cumprir todas as leis de imigração aplicáveis
- Pagar taxas conforme acordado

## 4. Processamento de Dados e Privacidade
Processamos seus dados pessoais de acordo com nossa Política de Privacidade e requisitos do RGPD.

## 5. Limitação de Responsabilidade
A responsabilidade da LVJ é limitada às taxas pagas pelos serviços. Não somos responsáveis pelos resultados dos pedidos de visto.

## 6. Rescisão
Qualquer parte pode rescindir os serviços com aviso por escrito de 30 dias.

Ao assinar abaixo, você reconhece que leu, entendeu e concorda em estar vinculado a estes termos.
      `,
      lastUpdated: "2025-08-13"
    },
    PRIVACY_POLICY: {
      version: CURRENT_TERMS_VERSION,
      type: "PRIVACY_POLICY",
      language: "PT",
      title: "Política de Privacidade",
      content: `
# Política de Privacidade - Assistente de Casos LVJ

**Data de Vigência:** 13 de Agosto de 2025
**Versão:** ${CURRENT_TERMS_VERSION}

## 1. Coleta de Dados
Coletamos informações pessoais necessárias para fornecer serviços de imigração, incluindo:
- Documentos de identidade
- Informações financeiras
- Detalhes de contato
- Comunicações relacionadas ao caso

## 2. Uso dos Dados
Seus dados são usados apenas para:
- Processar seu caso de imigração
- Comunicação com parceiros legais
- Melhoria do serviço
- Conformidade legal

## 3. Armazenamento de Dados
Todos os dados são armazenados com segurança em servidores da região da UE em conformidade com o RGPD.

## 4. Compartilhamento de Dados
Podemos compartilhar seus dados com:
- Parceiros legais (com seu consentimento)
- Autoridades governamentais (conforme exigido por lei)
- Prestadores de serviços (sob estrita confidencialidade)

## 5. Seus Direitos
Sob o RGPD, você tem o direito de:
- Acessar seus dados
- Solicitar correções
- Solicitar exclusão
- Portabilidade de dados
- Retirar consentimento

## 6. Informações de Contato
Para questões de privacidade, contacte: privacy@lvj.com
      `,
      lastUpdated: "2025-08-13"
    },
    MONITORING_CONSENT: {
      version: CURRENT_TERMS_VERSION,
      type: "MONITORING_CONSENT",
      language: "PT", 
      title: "Consentimento de Monitorização",
      content: `
# Consentimento de Monitorização - Assistente de Casos LVJ

**Data de Vigência:** 13 de Agosto de 2025
**Versão:** ${CURRENT_TERMS_VERSION}

## Propósito da Monitorização
Para garantir a qualidade do serviço e segurança, monitorizamos:
- Uso e desempenho da plataforma
- Interações de comunicação
- Atividades de processamento de documentos
- Comportamento do usuário para fins de segurança

## Dados Coletados
- Atividades de login e dados de sessão
- Padrões de uso de recursos
- Logs de erro e desempenho do sistema
- Metadados de comunicação (não conteúdo)

## Como Usamos Estes Dados
- Melhorar o desempenho da plataforma
- Aprimorar a experiência do usuário
- Detectar ameaças de segurança
- Gerar estatísticas de uso anônimas

## Seu Consentimento
Ao fornecer consentimento, você concorda com nossas atividades de monitorização conforme descrito acima.

## Retirada do Consentimento
Você pode retirar o consentimento a qualquer momento contactando support@lvj.com
      `,
      lastUpdated: "2025-08-13"
    }
  }
};

export async function hasAcceptedTerms(userId: string, termsType: TermsType, version: string): Promise<boolean> {
  const prisma = await getPrisma();
  const acceptance = await prisma.termsAcceptance.findFirst({
    where: {
      userId,
      termsType,
      termsVersion: version
    }
  });

  return !!acceptance;
}

export async function acceptTerms(
  userId: string, 
  termsType: TermsType, 
  version: string, 
  language: Language,
  signature: string,
  ipAddress: string,
  userAgent: string,
  gdprConsent: boolean = false,
  monitoringConsent: boolean = false
) {
  const prisma = await getPrisma();
  return await prisma.termsAcceptance.create({
    data: {
      userId,
      termsType,
      termsVersion: version,
      language,
      signature,
      ipAddress,
      userAgent,
      gdprConsentGiven: gdprConsent,
      monitoringConsentGiven: monitoringConsent
    }
  });
}

export async function getUserTermsStatus(userId: string) {
  const prisma = await getPrisma();
  const acceptances = await prisma.termsAcceptance.findMany({
    where: { userId },
    orderBy: { acceptedAt: 'desc' }
  });

  const hasAcceptedTnC = (acceptances as any[]).some((a: any) => 
    a.termsType === 'TERMS_AND_CONDITIONS' && 
    a.termsVersion === CURRENT_TERMS_VERSION
  );

  const hasAcceptedPrivacy = acceptances.some((a: any) => 
    a.termsType === 'PRIVACY_POLICY' && 
    a.termsVersion === CURRENT_TERMS_VERSION
  );

  const hasAcceptedMonitoring = acceptances.some((a: any) => 
    a.termsType === 'MONITORING_CONSENT' && 
    a.termsVersion === CURRENT_TERMS_VERSION
  );

  return {
    hasAcceptedTnC,
    hasAcceptedPrivacy,
    hasAcceptedMonitoring,
    allAccepted: hasAcceptedTnC && hasAcceptedPrivacy && hasAcceptedMonitoring,
    acceptances
  };
}
