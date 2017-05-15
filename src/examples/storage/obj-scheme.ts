export const Type = {
  string: 'string',
  integer: 'int',
  double: 'double',
  list: 'list',
  dateTime: 'datetime',
  object: 'object'
};

export interface ObjFieldType {
  type: string;
  subType: string;
}

export interface ObjectType {
  extends?: string;
  fields: {[key: string]: string | ObjFieldType}
}

export interface ObjScheme {
  [name: string]: ObjectType;
}

function validateObjectType(scheme: ObjScheme, name: string) {
  const obj = scheme[name];
  if (obj.extends && scheme[obj.extends] == null)
    throw `extends type '${obj.extends}' not found in scheme`;

  if (!obj.fields || Object.keys(obj.fields).length == 0)
    throw `empty object '${name}' found`;
}

export function validate(scheme: ObjScheme) {
  Object.keys(scheme).forEach(key => validateObjectType(scheme, key));
}