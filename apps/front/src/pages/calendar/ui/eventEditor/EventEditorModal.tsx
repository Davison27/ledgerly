import { useEffect, useState } from 'react';
import {
  Alert,
  App,
  Button,
  Col,
  ConfigProvider,
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
import type { EquipmentDto } from '@/entities/equipment';
import type { StaffMemberDto } from '@/entities/staff-member';
import { SPACE } from '@/shared/config/theme';
import {
  MAX_BLOCK_DAYS,
  eventScheduleShape,
  expandScheduleToDays,
  type EventScheduleWarning,
} from '../../model/eventEditorSchedule';
import styles from './EventEditorModal.module.css';

const { TextArea } = Input;
const { Text } = Typography;
const { RangePicker } = DatePicker;

type DateRangeValue = [Dayjs | null, Dayjs | null] | null;

interface EquipmentFieldValue {
  equipmentId?: string;
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
  equipment: EquipmentFieldValue[];
}

export interface EventEditorModalProps {
  open: boolean;
  event: ScheduleEventDto | null;
  staffMembers: StaffMemberDto[];
  equipment: EquipmentDto[];
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
  equipment,
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
        dateRange:
          shape.mode === 'range' ? [dayjs(shape.startDate), dayjs(shape.endDate)] : undefined,
        fullDay: shape.fullDay,
        startTime: shape.startTime ? dayjs(shape.startTime, 'HH:mm') : undefined,
        endTime: shape.endTime ? dayjs(shape.endTime, 'HH:mm') : undefined,
        staffMemberIds: event.staff.map((staffMember) => staffMember.id),
        equipment: event.equipment.map((equipment) => ({
          equipmentId: equipment.equipmentId,
          quantity: equipment.quantity,
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
          values.mode === 'single'
            ? values.date!.format('YYYY-MM-DD')
            : values.dateRange![0]!.format('YYYY-MM-DD');
        const endDate =
          values.mode === 'single'
            ? values.date!.format('YYYY-MM-DD')
            : values.dateRange![1]!.format('YYYY-MM-DD');

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
          equipment: values.equipment.map((equipment) => ({
            equipmentId: equipment.equipmentId!,
            quantity: equipment.quantity!,
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

  const equipmentLabel = (equipment: EquipmentDto) =>
    equipment.stock === 0
      ? `${equipment.name} (${t('equipment.stockUnset')})`
      : `${equipment.name} (${equipment.stock})`;

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
      classNames={{ body: styles.modalBody }}
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
        className={styles.form}
      >
        <div className={styles.topSection}>
          {warnings.includes('gaps') && (
            <Alert
              type="warning"
              showIcon
              title={t('calendar.editor.legacy.gaps')}
              className={styles.warningAlert}
            />
          )}
          {warnings.includes('mixedTimes') && (
            <Alert
              type="warning"
              showIcon
              title={t('calendar.editor.legacy.mixedTimes')}
              className={styles.warningAlert}
            />
          )}

          <Form.Item name="title" label={t('calendar.editor.fields.title')}>
            <Input placeholder={t('calendar.editor.placeholders.title')} />
          </Form.Item>

          <Form.Item name="notes" label={t('calendar.editor.fields.notes')}>
            <TextArea rows={2} placeholder={t('calendar.editor.placeholders.notes')} />
          </Form.Item>

          <Text strong className={styles.sectionLabel}>
            {t('calendar.editor.schedule.title')}
          </Text>

          <Form.Item name="mode" className={styles.modeItem}>
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
              rules={[{ required: true, message: t('calendar.editor.validation.rangeRequired') }]}
            >
              <DatePicker format="YYYY-MM-DD" />
            </Form.Item>
          ) : (
            <Form.Item
              key="dateRange"
              name="dateRange"
              label={t('calendar.editor.schedule.date')}
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
                format="YYYY-MM-DD"
                placeholder={[t('calendar.editor.schedule.from'), t('calendar.editor.schedule.to')]}
              />
            </Form.Item>
          )}

          <ConfigProvider theme={{ components: { Form: { itemMarginBottom: SPACE.sm } } }}>
            <Form.Item name="fullDay" valuePropName="checked">
              <Switch
                checkedChildren={t('calendar.editor.schedule.fullDay')}
                unCheckedChildren={t('calendar.editor.schedule.fullDay')}
                onChange={(checked) => setFullDay(checked)}
              />
            </Form.Item>
          </ConfigProvider>

          {!fullDay && (
            <Row gutter={8} className={styles.timeRow}>
              <Col flex="0 0 140px">
                <Form.Item
                  name="startTime"
                  label={t('calendar.editor.schedule.start')}
                  className={styles.tightItem}
                  rules={[
                    { required: true, message: t('calendar.editor.validation.startRequired') },
                  ]}
                >
                  <TimePicker format="HH:mm" />
                </Form.Item>
              </Col>
              <Col flex="0 0 140px">
                <Form.Item
                  name="endTime"
                  label={t('calendar.editor.schedule.end')}
                  dependencies={['startTime']}
                  className={styles.tightItem}
                  rules={[
                    { required: true, message: t('calendar.editor.validation.endRequired') },
                    ({ getFieldValue }) => ({
                      validator(_rule, value: Dayjs | undefined) {
                        const startTime = getFieldValue('startTime') as Dayjs | undefined;
                        if (!value || !startTime || value.isAfter(startTime))
                          return Promise.resolve();
                        return Promise.reject(
                          new Error(t('calendar.editor.validation.endAfterStart')),
                        );
                      },
                    }),
                  ]}
                >
                  <TimePicker format="HH:mm" />
                </Form.Item>
              </Col>
            </Row>
          )}

          <Form.Item name="staffMemberIds" label={t('calendar.editor.fields.staff')}>
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

          <Text strong className={styles.sectionLabel}>
            {t('calendar.editor.equipment.title')}
          </Text>
        </div>

        <Form.List name="equipment">
          {(fields, { add, remove }) => (
            <ConfigProvider theme={{ components: { Form: { itemMarginBottom: SPACE.sm } } }}>
              <div className={styles.equipmentList}>
                <Flex vertical gap={4}>
                  {fields.map((field) => (
                    <Flex key={field.key} gap={8} align="center" className={styles.equipmentRow}>
                      <div className={styles.equipmentSelectSlot}>
                        <Form.Item
                          name={[field.name, 'equipmentId']}
                          rules={[
                            {
                              required: true,
                              message: t('calendar.editor.validation.equipmentRequired'),
                            },
                          ]}
                        >
                          <Select
                            showSearch
                            placeholder={t('calendar.editor.placeholders.equipment')}
                            filterOption={(input, option) =>
                              (option?.label ?? '')
                                .toString()
                                .toLowerCase()
                                .includes(input.toLowerCase())
                            }
                            options={equipment.map((equipment) => ({
                              value: equipment.id,
                              label: equipmentLabel(equipment),
                            }))}
                          />
                        </Form.Item>
                      </div>
                      <div className={styles.equipmentQtySlot}>
                        <Form.Item
                          name={[field.name, 'quantity']}
                          rules={[
                            {
                              required: true,
                              message: t('calendar.editor.validation.quantityRequired'),
                            },
                            {
                              type: 'number',
                              min: 1,
                              message: t('calendar.editor.validation.quantityMin'),
                            },
                          ]}
                        >
                          <InputNumber
                            min={1}
                            precision={0}
                            placeholder={t('calendar.editor.placeholders.quantity')}
                          />
                        </Form.Item>
                      </div>
                      <div className={styles.equipmentRemoveSlot}>
                        <Button
                          type="text"
                          danger
                          icon={<MinusCircleOutlined />}
                          aria-label={t('calendar.editor.equipment.remove')}
                          onClick={() => remove(field.name)}
                        />
                      </div>
                    </Flex>
                  ))}
                </Flex>
              </div>
              <Flex vertical gap={4} className={styles.equipmentFooter}>
                <Button
                  type="dashed"
                  block
                  icon={<PlusOutlined />}
                  disabled={equipment.length === 0}
                  onClick={() => add({ quantity: 1 })}
                >
                  {t('calendar.editor.equipment.add')}
                </Button>
                {equipment.length === 0 && (
                  <Text type="secondary" className={styles.noEquipmentHint}>
                    {t('calendar.editor.equipment.noneAvailable')}
                  </Text>
                )}
              </Flex>
            </ConfigProvider>
          )}
        </Form.List>
      </Form>
    </Modal>
  );
}
