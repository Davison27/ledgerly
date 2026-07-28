import { CompanyBranding } from '../../application/get-company-branding/company-branding';

export class CompanyBrandingResponse {
  name: string;
  logo: string | null;
  brandColor: string | null;

  private constructor(props: { name: string; logo: string | null; brandColor: string | null }) {
    this.name = props.name;
    this.logo = props.logo;
    this.brandColor = props.brandColor;
  }

  static fromBranding(branding: CompanyBranding): CompanyBrandingResponse {
    return new CompanyBrandingResponse({
      name: branding.name,
      logo: branding.logo,
      brandColor: branding.brandColor,
    });
  }
}
