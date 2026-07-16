import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useNavigate } from "react-router-dom";
import { logout } from "../../utils/auth";
import Button from "../ui/Button";
import { PageHeader } from "../ui/SystemUI";
export default function AppHeader({title,subtitle,description,eyebrow="Controle Operacional",showBack=false,showLogout=true,actions=null,breadcrumb=null}){const navigate=useNavigate();function handleLogout(){if(!window.confirm("Deseja sair do sistema?"))return;logout();navigate("/login",{replace:true})}const defaultActions=_jsxs("div",{className:"app-header__actions",children:[showBack?_jsx(Button,{variant:"secondary",className:"app-header__back",onClick:()=>navigate(-1),children:"← Voltar"}):null,_jsx(Button,{variant:"secondary",onClick:()=>navigate("/perfil"),children:"Perfil"}),showLogout?_jsx(Button,{variant:"danger",className:"app-header__logout",onClick:handleLogout,children:"Deslogar"}):null]});return _jsx(PageHeader,{className:"app-header",title,description:description??subtitle,eyebrow,breadcrumb,actions:actions??defaultActions})}
