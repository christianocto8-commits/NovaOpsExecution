export type BuilderField = {
  id: number;
  label: string;
  field_type: string;
  is_required: boolean;
  placeholder?: string;
  help_text?: string;
};

export type BuilderSection = {
  id: number;
  title: string;
  description?: string;
  fields: BuilderField[];
};

export type BuilderDocument = {
  metadata: {
    title: string;
    description: string;
    formType: string;
    status: "draft" | "published";
    version: number;
  };
  sections: BuilderSection[];
};
