import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import Button from "../ui/Button";
function isVideoUrl(value) {
    return /\.(mp4|webm|mov|m4v|avi|mkv)$/i.test(value.split("?")[0] ?? "");
}
function isVideoFile(file) {
    return file.type.startsWith("video/") || isVideoUrl(file.name);
}
export default function PhotoUpload({ files, previews, uploadedPhotos, onChangeFiles, onRemoveFile, onSend, sending }) {
    return (_jsxs("div", { className: "photo-upload", children: [_jsxs("label", { className: "input-field", children: [_jsx("span", { className: "input-field__label", children: "Selecione fotos e videos" }), _jsx("input", { type: "file", multiple: true, accept: "image/*,video/*", onChange: (e) => onChangeFiles(Array.from(e.target.files ?? [])) })] }), files.length > 0 ? (_jsx("div", { className: "photo-upload__grid", children: files.map((file, index) => (_jsxs("figure", { className: "photo-upload__item", children: [isVideoFile(file) ? _jsx("video", { src: previews[index], controls: true, muted: true, playsInline: true }) : _jsx("img", { src: previews[index], alt: file.name }), _jsx("figcaption", { children: file.name }), _jsx(Button, { variant: "ghost", type: "button", onClick: () => onRemoveFile(index), children: "Remover" })] }, `${file.name}-${index}`))) })) : null, files.length > 0 ? (_jsx(Button, { type: "button", onClick: onSend, disabled: sending, children: sending ? "Enviando..." : "Enviar arquivos" })) : null, uploadedPhotos.length > 0 ? (_jsx("div", { className: "photo-upload__grid", children: uploadedPhotos.map((photo) => (_jsxs("figure", { className: "photo-upload__item", children: [isVideoUrl(photo.imageUrl || photo.fileName) ? _jsx("video", { src: photo.imageUrl, controls: true, playsInline: true }) : _jsx("img", { src: photo.imageUrl, alt: photo.fileName }), _jsx("figcaption", { children: photo.fileName })] }, photo.id))) })) : null] }));
}
