import { useEffect, useState } from 'react';
import {
  Alert,
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
  Segmented,
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
import {
  MAX_BLOCK_DAYS,
  eventScheduleShape,
  expandScheduleToDays,
  type EventScheduleWarning,
} from '../model/eventEditorSchedule';

const { TextArea } = Input;
const { Text } = Typography;
const { RangePicker } = DatePicker;

type DateRangeValue = [Dayjs | null, Dayjs | null] | null;

interface ProductFieldValue {
  productId?: string;
  quantity?: number;
}

interface EventEditorFormValues {
  title?: string;
  notes?: string;
  mode: 'single' | 'range';
  date?: Dayjs;
  dateRange?: DateRangeValue;
  fullDay: boolean;
  startTime?: Dayjs;
  endTime?: Dayjs;
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
  const [warnings, setWarnings] = useState<EventScheduleWarning[]>([]);
  const [mode, setMode] = useState<EventEditorFormValues['mode']>('single');
  const [fullDay, setFullDay] = useState(true);

  useEffect(() => {
    if (open && event) {
      form.resetFields();
      const shape = eventScheduleShape(event);
      setWarnings(shape.warnings);
      setMode(shape.mode);
      setFullDay(shape.fullDay);
      form.setFieldsValue({
        title: event.title ?? '',
        notes: event.notes ?? '',
        mode: shape.mode,
        date: shape.mode === 'single' ? dayjs(shape.startDate) : undefined,
        dateRange: shape.mode === 'range' ? [dayjs(shape.startDate), dayjs(shape.endDate)] : undefined,
        fullDay: shape.fullDay,
        startTime: shape.startTime ? dayjs(shape.startTime, 'HH:mm') : undefined,
        endTime: shape.endTime ? dayjs(shape.endTime, 'HH:mm') : undefined,
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
      setWarnings([]);
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
        const startDate =
          values.mode === 'single' ? values.date!.format('YYYY-MM-DD') : values.dateRange![0]!.format('YYYY-MM-DD');
        const endDate =
          values.mode === 'single' ? values.date!.format('YYYY-MM-DD') : values.dateRange![1]!.format('YYYY-MM-DD');

        const payload: UpdateScheduleEventPayload = {
          title: values.title?.trim() ? values.title.trim() : null,
          notes: values.notes?.trim() ? values.notes.trim() : null,
          days: expandScheduleToDays(
            startDate,
            endDate,
            values.fullDay,
            values.fullDay ? null : (values.startTime?.format('HH:mm') ?? null),
            values.fullDay ? null : (values.endTime?.format('HH:mm') ?? null),
          ),
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
      styles={{ body: { display: 'flex', flexDirection: 'column', maxHeight: '72vh', overflow: 'hidden' } }}
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
      <Form<EventEditorFormValues>
        form={form}
        layout="vertical"
        requiredMark={false}
        style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}
      >
        <div style={{ flex: '0 0 auto' }}>
          {warnings.includes('gaps') && (
            <Alert type="warning" showIcon message={t('calendar.editor.legacy.gaps')} style={{ marginBottom: 12 }} />
          )}
          {warnings.includes('mixedTimes') && (
            <Alert
              type="warning"
              showIcon
              message={t('calendar.editor.legacy.mixedTimes')}
              style={{ marginBottom: 12 }}
            />
          )}

          <Form.Item name="title" label={t('calendar.editor.fields.title')} style={{ marginBottom: 12 }}>
            <Input placeholder={t('calendar.editor.placeholders.title')} />
          </Form.Item>

          <Form.Item name="notes" label={t('calendar.editor.fields.notes')} style={{ marginBottom: 12 }}>
            <TextArea rows={2} placeholder={t('calendar.editor.placeholders.notes')} />
          </Form.Item>

          <Text strong style={{ fontSize: 13 }}>
            {t('calendar.editor.schedule.title')}
          </Text>

          <Form.Item name="mode" style={{ marginTop: 8, marginBottom: 8 }}>
            <Segmented
              options={[
                { label: t('calendar.editor.schedule.modeSingle'), value: 'single' },
                { label: t('calendar.editor.schedule.modeRange'), value: 'range' },
              ]}
              onChange={(value) => setMode(value as EventEditorFormValues['mode'])}
            />
          </Form.Item>

          {mode === 'single' ? (
            <Form.Item
              key="date"
              name="date"
              label={t('calendar.editor.schedule.date')}
              style={{ marginBottom: 12 }}
              rules={[{ required: true, message: t('calendar.editor.validation.rangeRequired') }]}
            >
              <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
            </Form.Item>
          ) : (
            <Form.Item
              key="dateRange"
              name="dateRange"
              label={t('calendar.editor.schedule.date')}
              style={{ marginBottom: 12 }}
              rules={[
                { required: true, message: t('calendar.editor.validation.rangeRequired') },
                {
                  validator: async (_rule, value: DateRangeValue) => {
                    if (!value?.[0] || !value[1]) return;
                    if (value[1].diff(value[0], 'day') + 1 > MAX_BLOCK_DAYS) {
                      throw new Error(t('calendar.editor.validation.rangeTooLong'));
                    }
                  },
                },
              ]}
            >
              <RangePicker
                style={{ width: '100%' }}
                format="YYYY-MM-DD"
                placeholder={[t('calendar.editor.schedule.from'), t('calendar.editor.schedule.to')]}
              />
            </Form.Item>
          )}

          <Form.Item name="fullDay" valuePropName="checked" style={{ marginBottom: 8 }}>
            <Switch
              checkedChildren={t('calendar.editor.schedule.fullDay')}
              unCheckedChildren={t('calendar.editor.schedule.fullDay')}
              onChange={(checked) => setFullDay(checked)}
            />
          </Form.Item>

          {!fullDay && (
            <Row gutter={8} style={{ marginBottom: 12 }}>
              <Col flex="0 0 140px">
                <Form.Item
                  name="startTime"
                  label={t('calendar.editor.schedule.start')}
                  style={{ marginBottom: 0 }}
                  rules={[{ required: true, message: t('calendar.editor.validation.startRequired') }]}
                >
                  <TimePicker style={{ width: '100%' }} format="HH:mm" />
                </Form.Item>
              </Col>
              <Col flex="0 0 140px">
                <Form.Item
                  name="endTime"
                  label={t('calendar.editor.schedule.end')}
                  dependencies={['startTime']}
                  style={{ marginBottom: 0 }}
                  rules={[
                    { required: true, message: t('calendar.editor.validation.endRequired') },
                    ({ getFieldValue }) => ({
                      validator(_rule, value: Dayjs | undefined) {
                        const startTime = getFieldValue('startTime') as Dayjs | undefined;
                        if (!value || !startTime || value.isAfter(startTime)) return Promise.resolve();
                        return Promise.reject(new Error(t('calendar.editor.validation.endAfterStart')));
                      },
                    }),
                  ]}
                >
                  <TimePicker style={{ width: '100%' }} format="HH:mm" />
                </Form.Item>
              </Col>
            </Row>
          )}

          <Form.Item
            name="staffMemberIds"
            label={t('calendar.editor.fields.staff')}
            style={{ marginBottom: 12 }}
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
        </div>

        <Form.List name="products">
          {(fields, { add, remove }) => (
            <>
              <div
                style={{
                  flex: '1 1 auto',
                  minHeight: 0,
                  overflowX: 'hidden',
                  overflowY: 'auto',
                  marginTop: 8,
                  marginBottom: 8,
                }}
              >
                <Flex vertical gap={4}>
                  {fields.map((field) => (
                    <Flex key={field.key} gap={8} align="center" style={{ minWidth: 0 }}>
                      <div style={{ flex: '1 1 auto', minWidth: 0 }}>
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
                      </div>
                      <div style={{ flex: '0 0 110px' }}>
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
                      </div>
                      <div style={{ flex: '0 0 32px' }}>
                        <Button
                          type="text"
                          danger
                          icon={<MinusCircleOutlined />}
                          aria-label={t('calendar.editor.products.remove')}
                          onClick={() => remove(field.name)}
                        />
                      </div>
                    </Flex>
                  ))}
                </Flex>
              </div>
              <Flex vertical gap={4} style={{ flex: '0 0 auto' }}>
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
            </>
          )}
        </Form.List>
      </Form>
    </Modal>
  );
}
