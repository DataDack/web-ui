/*
  CredentialFieldRenderer — Renders structured form fields for a credential
  schema using shadcn/ui components. Each field type maps to the appropriate
  input component.
*/

import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Textarea,
} from "@datadack/common-ui"

function PasswordInput({ value, onChange, placeholder, className }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className='relative'>
      <Input
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={className}
      />
      <Button
        type='button'
        variant='ghost'
        size='icon'
        className='absolute right-0 top-0 h-full w-8 text-muted-foreground hover:text-foreground'
        onClick={() => setVisible((v) => !v)}
      >
        {visible ? <EyeOff size={14} /> : <Eye size={14} />}
      </Button>
    </div>
  );
}

function FieldInput({ field, value, onChange }) {
  const inputClass = 'h-8 text-xs';

  switch (field.type) {
    case 'password':
      return (
        <PasswordInput
          value={value || ''}
          onChange={onChange}
          placeholder={field.placeholder || ''}
          className={inputClass}
        />
      );

    case 'number':
      return (
        <Input
          type='number'
          value={value ?? field.default ?? ''}
          onChange={(e) => onChange(e.target.value === '' ? '' : parseFloat(e.target.value))}
          placeholder={field.placeholder || ''}
          className={inputClass}
        />
      );

    case 'boolean':
      return (
        <Switch
          checked={!!value}
          onCheckedChange={onChange}
          className='data-[state=checked]:bg-primary'
        />
      );

    case 'select':
      return (
        <Select value={String(value || field.default || '')} onValueChange={onChange}>
          <SelectTrigger className='h-8 text-xs'>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(field.options || []).map((opt) => (
              <SelectItem key={opt} value={opt} className='text-xs'>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );

    case 'url':
      return (
        <Input
          type='url'
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder || 'https://'}
          className={inputClass}
        />
      );

    case 'textarea':
      return (
        <Textarea
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder || ''}
          rows={field.rows || 6}
          className='text-xs font-mono'
        />
      );

    case 'string':
    default:
      return (
        <Input
          type='text'
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder || ''}
          className={inputClass}
        />
      );
  }
}

export default function CredentialFieldRenderer({ fields, values, onChange }) {
  const handleFieldChange = (key, val) => {
    onChange({ ...values, [key]: val });
  };

  return (
    <div className='space-y-3'>
      {fields.map((field) => (
        <div key={field.key} className='space-y-1.5'>
          <Label className='text-[11px] font-medium flex items-center gap-1'>
            {field.label}
            {field.required && <span className='text-destructive'>*</span>}
          </Label>
          <FieldInput
            field={field}
            value={values[field.key]}
            onChange={(val) => handleFieldChange(field.key, val)}
          />
        </div>
      ))}
    </div>
  );
}
