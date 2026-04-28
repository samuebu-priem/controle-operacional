import type { ChangeEvent } from "react";
import Button from "../ui/Button";

type PhotoUploadProps = {
  files: File[];
  previews: string[];
  uploadedPhotos: Array<{ id: string; imageUrl: string; fileName: string }>;
  onChangeFiles: (files: File[]) => void;
  onRemoveFile: (index: number) => void;
  onSend: () => void;
  sending: boolean;
};

export default function PhotoUpload({
  files,
  previews,
  uploadedPhotos,
  onChangeFiles,
  onRemoveFile,
  onSend,
  sending
}: PhotoUploadProps) {
  return (
    <div className="photo-upload">
      <label className="input-field">
        <span className="input-field__label">Selecione fotos</span>
        <input type="file" multiple accept="image/*" onChange={(e: ChangeEvent<HTMLInputElement>) => onChangeFiles(Array.from(e.target.files ?? []))} />
      </label>

      {files.length > 0 ? (
        <div className="photo-upload__grid">
          {files.map((file, index) => (
            <figure className="photo-upload__item" key={`${file.name}-${index}`}>
              <img src={previews[index]} alt={file.name} />
              <figcaption>{file.name}</figcaption>
              <Button variant="ghost" type="button" onClick={() => onRemoveFile(index)}>
                Remover
              </Button>
            </figure>
          ))}
        </div>
      ) : null}

      {files.length > 0 ? (
        <Button type="button" onClick={onSend} disabled={sending}>
          {sending ? "Enviando..." : "Enviar fotos"}
        </Button>
      ) : null}

      {uploadedPhotos.length > 0 ? (
        <div className="photo-upload__grid">
          {uploadedPhotos.map((photo) => (
            <figure className="photo-upload__item" key={photo.id}>
              <img src={photo.imageUrl} alt={photo.fileName} />
              <figcaption>{photo.fileName}</figcaption>
            </figure>
          ))}
        </div>
      ) : null}
    </div>
  );
}
