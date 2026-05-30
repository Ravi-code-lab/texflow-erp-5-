import { BaseEntity, ViewState } from '../types';
import { DocTypeSchema, getDocTypeSchema } from './doctypes';

const SERIES_COUNTER_PREFIX = 'texflow_series';

const getSeriesKey = (schema: DocTypeSchema, year: number) =>
  `${SERIES_COUNTER_PREFIX}:${schema.name}:${schema.namingSeries}:${year}`;

const nextSeriesNumber = (schema: DocTypeSchema, year: number) => {
  if (typeof window === 'undefined') {
    return Number(`${Date.now()}`.slice(-4));
  }

  const key = getSeriesKey(schema, year);
  const next = Number(window.localStorage.getItem(key) || '0') + 1;
  window.localStorage.setItem(key, String(next));
  return next;
};

export const makeNameFromSeries = (schema: DocTypeSchema, date = new Date()) => {
  const year = date.getFullYear();
  const sequence = nextSeriesNumber(schema, year);

  return schema.namingSeries
    .split('.')
    .map((part) => {
      if (part === 'YYYY') return String(year);
      if (part === 'YY') return String(year).slice(-2);
      if (/^#+$/.test(part)) return String(sequence).padStart(part.length, '0');
      return part;
    })
    .join('');
};

export const getDefaultDocStatus = (status?: string): 0 | 1 | 2 => {
  if (!status) return 0;
  if (status === 'CANCELLED') return 2;
  if (['COMPLETED', 'FULFILLED', 'RECEIVED', 'PAID', 'PASSED'].includes(status)) return 1;
  return 0;
};

export const createERPDocument = <T extends Partial<BaseEntity> & Record<string, any>>(
  view: ViewState,
  values: T,
  options: { date?: Date; status?: string } = {}
) => {
  const schema = getDocTypeSchema(view);
  const now = new Date();
  const status = options.status || values.status;
  const id = values.id || (schema ? makeNameFromSeries(schema, options.date || now) : `${view}-${Date.now()}`);

  return {
    ...values,
    id,
    doctype: schema?.name,
    namingSeries: schema?.namingSeries,
    docstatus: getDefaultDocStatus(status),
    createdAt: values.createdAt || now.toISOString(),
    updatedAt: now.toISOString(),
  } as T & BaseEntity;
};
