import { useEffect, useState } from 'react';
import { App, Form, type FormInstance } from 'antd';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { companyQueries, updateCompany, useCompany } from '@/entities/company';
import { BRAND_DEFAULT } from '@/shared/config/theme';

export interface CompanyProfileFormValues {
  name: string;
  legalName?: string;
  taxId?: string;
  sector?: string;
  brandColor?: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
}

export interface UseCompanyProfileFormResult {
  form: FormInstance<CompanyProfileFormValues>;
  loading: boolean;
  logo: string | undefined;
  onLogoChange: (nextLogo: string | undefined) => void;
  dirty: boolean;
  saving: boolean;
  onValuesChange: () => void;
  save: () => Promise<void>;
  reset: () => void;
}

function toFormValues(company: {
  name: string;
  legalName?: string;
  taxId?: string;
  sector?: string;
  brandColor?: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
}): CompanyProfileFormValues {
  return { ...company, brandColor: company.brandColor ?? BRAND_DEFAULT };
}

export function useCompanyProfileForm(): UseCompanyProfileFormResult {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const { company, isLoading } = useCompany();
  const [form] = Form.useForm<CompanyProfileFormValues>();
  const [logo, setLogo] = useState<string | undefined>(company.logo);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      form.setFieldsValue(toFormValues(company));
      setLogo(company.logo);
      setDirty(false);
    }
  }, [isLoading, company, form]);

  const onValuesChange = () => {
    setDirty(true);
  };

  const onLogoChange = (nextLogo: string | undefined) => {
    setLogo(nextLogo);
    setDirty(true);
  };

  const reset = () => {
    form.setFieldsValue(toFormValues(company));
    setLogo(company.logo);
    setDirty(false);
  };

  const save = async () => {
    let values: CompanyProfileFormValues;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }

    setSaving(true);
    try {
      await updateCompany({ ...values, logo });
      await queryClient.invalidateQueries({ queryKey: companyQueries.singleton().queryKey });
      setDirty(false);
      void message.success(t('company.settings.saved'));
    } catch {
      void message.error(t('company.settings.error'));
    } finally {
      setSaving(false);
    }
  };

  return { form, loading: isLoading, logo, onLogoChange, dirty, saving, onValuesChange, save, reset };
}
