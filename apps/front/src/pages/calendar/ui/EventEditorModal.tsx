import { useEffect } from 'react';
import {
  App,
  Button,
  Col,
  DatePicker,
  Flex,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Row,
  Select,
  Switch,
  TimePicker,
  Typography,
} from 'antd';
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import type { ScheduleEventDto, UpdateScheduleEventPayload } from '@/entities/schedule-event';
import type { ProductDto } from '@/entities/product';
import type { StaffMemberDto } from '@/entities/staff-member';

const { TextArea } = Input;
const { Text } = Typography;

interface DayFieldValue {
  date: Dayjs;
  fullDay: boolean;
  startTime?: Dayjs;
  endTime?: Dayjs;
}

interface ProductFieldValue {
  productId?: string;
  quantity?: number;
}

interface EventEditorFormValues {
  title?: string;
  notes?: string;
  days: DayFieldValue[];
  staffMemberIds: string[];
  products: ProductFieldValue[];
}

export interface EventEditorModalProps {
  open: boolean;
  event: ScheduleEventDto | null;
  staffMembers: StaffMemberDto[];
  products: ProductDto[];
  onCancel: () => void;
  onSave: (eventId: string, payload: UpdateScheduleEventPayload) => void | Promise<void>;
  onDelete: (eventId: string) => void | Promise<void>;
  submitting?: boolean;
  deleting?: boolean;
}

export function EventEditorModal({
  open,
  event,
  staffMembers,
  products,
  onCancel,
  onSave,
  onDelete,
  submitting,
  deleting,
}: EventEditorModalProps) {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const [form] = Form.useForm<EventEditorFormValues>();

  useEffect(() => {
    if (open && event) {
      form.resetFields();
      form.setFieldsValue({
        title: event.title ?? '',
        notes: event.notes ?? '',
        days: event.days.map((day) => ({
          date: dayjs(day.date),
          fullDay: !day.startTime || !day.endTime,
          startTime: day.startTime ? dayjs(day.startTime, 'HH:mm') : undefined,
          endTime: day.endTime ? dayjs(day.endTime, 'HH:mm') : undefined,
        })),
        staffMemberIds: event.staff.map((staffMember) => staffMember.id),
        products: event.products.map((product) => ({
          productId: product.productId,
          quantity: product.quantity,
        })),
      });
    }
  }, [open, event, form]);

  useEffect(() => {
    if (!open) {
      form.resetFields();
    }
  }, [open, form]);

  const handleCancel = () => {
    form.resetFields();
    onCancel();
  };

  const handleOk = () => {
    if (!event) return;
    form
      .validateFields()
      .then((values) => {
        const payload: UpdateScheduleEventPayload = {
          title: values.title?.trim() ? values.title.trim() : null,
          notes: values.notes?.trim() ? values.notes.trim() : null,
          days: values.days.map((day) => ({
            date: day.date.format('YYYY-MM-DD'),
            startTime: day.fullDay ? undefined : day.startTime?.format('HH:mm'),
            endTime: day.fullDay ? undefined : day.endTime?.format('HH:mm'),
          })),
          staffMemberIds: values.staffMemberIds ?? [],
          products: values.products.map((product) => ({
            productId: product.productId!,
            quantity: product.quantity!,
          })),
        };
        return onSave(event.id, payload);
      })
      .catch((errorInfo: { errorFields?: { name: (string | number)[] }[] }) => {
        if (errorInfo?.errorFields && errorInfo.errorFields.length > 0) {
          form.scrollToField(errorInfo.errorFields[0].name);
          void message.error(t('calendar.editor.validation.formInvalid'));
        }
      });
  };

  const handleDelete = () => {
    if (!event) return;
    void onDelete(event.id);
  };

  const productLabel = (product: ProductDto) =>
    product.stock === 0
      ? `${product.name} (${t('products.stockUnset')})`
      : `${product.name} (${product.stock})`;

  return (
    <Modal
      open={open}
      title={t('calendar.editor.title')}
      okText={t('calendar.editor.save')}
      cancelText={t('common.cancel')}
      onOk={handleOk}
      onCancel={handleCancel}
      confirmLoading={submitting}
      destroyOnHidden
      centered
      width="min(760px, 95vw)"
      styles={{ body: { maxHeight: '75vh', overflowY: 'auto' } }}
      footer={(_, { OkBtn, CancelBtn }) => (
        <Flex justify="space-between" align="center">
          <Popconfirm
            title={t('calendar.editor.deleteConfirm.title')}
            description={t('calendar.editor.deleteConfirm.content')}
            okText={t('calendar.editor.deleteConfirm.ok')}
            cancelText={t('common.cancel')}
            okButtonProps={{ danger: true }}
            onConfirm={handleDelete}
          >
            <Button danger loading={deleting}>
              {t('calendar.editor.delete')}
            </Button>
          </Popconfirm>
          <Flex gap={8}>
            <CancelBtn />
            <OkBtn />
          </Flex>
        </Flex>
      )}
    >
      <Form<EventEditorFormValues> form={form} layout="vertical" requiredMark={false}>
        <Form.Item name="title" label={t('calendar.editor.fields.title')} style={{ marginBottom: 12 }}>
          <Input placeholder={t('calendar.editor.placeholders.title')} />
        </Form.Item>

        <Form.Item name="notes" label={t('calendar.editor.fields.notes')} style={{ marginBottom: 12 }}>
          <TextArea rows={2} placeholder={t('calendar.editor.placeholders.notes')} />
        </Form.Item>

        <Text strong style={{ fontSize: 13 }}>
          {t('calendar.editor.days.title')}
        </Text>
        <Form.List
          name="days"
          rules={[
            {
              validator: async (_rule, days: DayFieldValue[] = []) => {
                const dates = days
                  .map((day) => day?.date)
                  .filter((date): date is Dayjs => Boolean(date))
                  .map((date) => date.format('YYYY-MM-DD'));
                if (new Set(dates).size !== dates.length) {
                  throw new Error(t('calendar.editor.validation.duplicateDate'));
                }
              },
            },
          ]}
        >
          {(fields, { add, remove }, { errors }) => (
            <Flex vertical gap={4} style={{ marginTop: 8, marginBottom: 8 }}>
              {fields.map((field) => (
                <Row gutter={8} key={field.key} align="middle">
                  <Col flex="0 0 150px">
                    <Form.Item
                      name={[field.name, 'date']}
                      style={{ marginBottom: 8 }}
                      rules={[{ required: true, message: t('calendar.editor.validation.dateRequired') }]}
                    >
                      <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
                    </Form.Item>
                  </Col>
                  <Col flex="0 0 130px">
                    <Form.Item
                      name={[field.name, 'fullDay']}
                      valuePropName="checked"
                      style={{ marginBottom: 8 }}
                    >
                      <Switch
                        checkedChildren={t('calendar.editor.days.fullDay')}
                        unCheckedChildren={t('calendar.editor.days.fullDay')}
                      />
                    </Form.Item>
                  </Col>
                  <Form.Item shouldUpdate noStyle>
                    {() => {
                      const isFullDay = form.getFieldValue(['days', field.name, 'fullDay']) as boolean;
                      if (isFullDay) return null;
                      return (
                        <>
                          <Col flex="0 0 110px">
                            <Form.Item
                              name={[field.name, 'startTime']}
                              style={{ marginBottom: 8 }}
                              rules={[
                                { required: true, message: t('calendar.editor.validation.startRequired') },
                              ]}
                            >
                              <TimePicker
                                style={{ width: '100%' }}
                                format="HH:mm"
                                placeholder={t('calendar.editor.days.start')}
                              />
                            </Form.Item>
                          </Col>
                          <Col flex="0 0 110px">
                            <Form.Item
                              name={[field.name, 'endTime']}
                              style={{ marginBottom: 8 }}
                              rules={[
                                { required: true, message: t('calendar.editor.validation.endRequired') },
                              ]}
                            >
                              <TimePicker
                                style={{ width: '100%' }}
                                format="HH:mm"
                                placeholder={t('calendar.editor.days.end')}
                              />
                            </Form.Item>
                          </Col>
                        </>
                      );
                    }}
                  </Form.Item>
                  <Col flex="0 0 32px">
                    <Button
                      type="text"
                      danger
                      icon={<MinusCircleOutlined />}
                      aria-label={t('calendar.editor.days.remove')}
                      disabled={fields.length <= 1}
                      onClick={() => remove(field.name)}
                    />
                  </Col>
                </Row>
              ))}
              <Button
                type="dashed"
                block
                icon={<PlusOutlined />}
                onClick={() => {
                  const currentDays = (form.getFieldValue('days') as DayFieldValue[] | undefined) ?? [];
                  const lastDate = currentDays[currentDays.length - 1]?.date;
                  const nextDate = lastDate ? dayjs(lastDate).add(1, 'day') : dayjs();
                  add({ date: nextDate, fullDay: true });
                }}
              >
                {t('calendar.editor.days.add')}
              </Button>
              <Form.ErrorList errors={errors} />
            </Flex>
          )}
        </Form.List>

        <Form.Item
          name="staffMemberIds"
          label={t('calendar.editor.fields.staff')}
          style={{ marginBottom: 12, marginTop: 12 }}
        >
          <Select
            mode="multiple"
            allowClear
            placeholder={t('calendar.editor.placeholders.staff')}
            options={staffMembers.map((staffMember) => ({
              value: staffMember.id,
              label: `${staffMember.firstName} ${staffMember.lastName}`,
            }))}
          />
        </Form.Item>

        <Text strong style={{ fontSize: 13 }}>
          {t('calendar.editor.products.title')}
        </Text>
        <Form.List name="products">
          {(fields, { add, remove }) => (
            <Flex vertical gap={4} style={{ marginTop: 8 }}>
              {fields.map((field) => (
                <Row gutter={8} key={field.key} align="middle">
                  <Col flex="auto">
                    <Form.Item
                      name={[field.name, 'productId']}
                      style={{ marginBottom: 8 }}
                      rules={[
                        { required: true, message: t('calendar.editor.validation.productRequired') },
                      ]}
                    >
                      <Select
                        showSearch
                        placeholder={t('calendar.editor.placeholders.product')}
                        filterOption={(input, option) =>
                          (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
                        }
                        options={products.map((product) => ({
                          value: product.id,
                          label: productLabel(product),
                        }))}
                      />
                    </Form.Item>
                  </Col>
                  <Col flex="0 0 120px">
                    <Form.Item
                      name={[field.name, 'quantity']}
                      style={{ marginBottom: 8 }}
                      rules={[
                        { required: true, message: t('calendar.editor.validation.quantityRequired') },
                        { type: 'number', min: 1, message: t('calendar.editor.validation.quantityMin') },
                      ]}
                    >
                      <InputNumber
                        style={{ width: '100%' }}
                        min={1}
                        precision={0}
                        placeholder={t('calendar.editor.placeholders.quantity')}
                      />
                    </Form.Item>
                  </Col>
                  <Col flex="0 0 32px">
                    <Button
                      type="text"
                      danger
                      icon={<MinusCircleOutlined />}
                      aria-label={t('calendar.editor.products.remove')}
                      onClick={() => remove(field.name)}
                    />
                  </Col>
                </Row>
              ))}
              <Button
                type="dashed"
                block
                icon={<PlusOutlined />}
                disabled={products.length === 0}
                onClick={() => add({ quantity: 1 })}
              >
                {t('calendar.editor.products.add')}
              </Button>
              {products.length === 0 && (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {t('calendar.editor.products.noneAvailable')}
                </Text>
              )}
            </Flex>
          )}
        </Form.List>
      </Form>
    </Modal>
  );
}
