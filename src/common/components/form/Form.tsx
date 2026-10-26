import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';
import { getT } from '../../services/i18n';
import { useDialog } from '../overlay';
import { FormContext, type FieldRecord, type FormContextValue } from './formContext';

export type FormProps = {
  children: ReactNode;
  onSubmit?: (data: Record<string, string>) => void;
  onReset?: () => void;
  confirmReset?: boolean;
  className?: string;
};

function buildOutput(records: FieldRecord[]): Record<string, string> {
  return Object.fromEntries(records.map((record) => [record.name, record.getValue()]));
}

export function Form({
  children,
  onSubmit,
  onReset,
  confirmReset = true,
  className,
}: FormProps) {
  const dialog = useDialog();
  const recordsRef = useRef<Map<string, FieldRecord>>(new Map());
  const [submitCount, setSubmitCount] = useState(0);

  const register = useCallback((record: FieldRecord) => {
    recordsRef.current.set(record.id, record);
  }, []);
  const unregister = useCallback((id: string) => {
    recordsRef.current.delete(id);
  }, []);

  const context = useMemo<FormContextValue>(
    () => ({ register, unregister, submitCount }),
    [register, unregister, submitCount],
  );

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const records = Array.from(recordsRef.current.values());
    records.forEach((record) => record.markTouched());
    setSubmitCount((count) => count + 1);
    const valid = records.every((record) => record.isValid());
    if (valid) {
      onSubmit?.(buildOutput(records));
    }
  };

  const handleReset = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const confirmed =
      !confirmReset ||
      (await dialog.confirm({
        text: getT().common.resetConfirm,
        confirmButtonTheme: 'danger',
        confirmButtonText: getT().common.yesDoIt,
        cancelButtonText: getT().common.notAnymore,
      }));
    if (confirmed) {
      onReset?.();
    }
  };

  return (
    <FormContext.Provider value={context}>
      <form
        className={className}
        onSubmit={handleSubmit}
        onReset={handleReset}
        noValidate
      >
        {children}
      </form>
    </FormContext.Provider>
  );
}
