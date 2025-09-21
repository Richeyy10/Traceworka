import React, { InputHTMLAttributes } from 'react';

// Extend InputHTMLAttributes to correctly type the component
interface InputFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  name: string;
  placeholder?: string;
}

const InputField: React.FC<InputFieldProps> = ({
  label,
  name,
  value,
  onChange,
  type = 'text',
  placeholder,
  required,
  readOnly,
}) => {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <input
        type={type}
        name={name}
        id={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        readOnly={readOnly}
        className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm text-black focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2
          ${readOnly ? 'bg-gray-200 cursor-not-allowed' : ''}
        `}
      />
    </div>
  );
};

export default InputField;