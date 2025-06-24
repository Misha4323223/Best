import { useToast } from "@/hooks/use-toast";
import { AlertCircle, CheckCircle, X } from "lucide-react";

interface ToastProps {
  type: "success" | "error";
  title: string;
  message: string;
  id: string;
}

const Toast: React.FC<ToastProps> = ({ type, title, message, id }) => {
  const { dismiss } = useToast();
  
  const borderColor = type === "success" ? "border-status-success" : "border-status-error";
  const iconColor = type === "success" ? "text-status-success" : "text-status-error";
  const titleColor = type === "success" ? "text-status-success" : "text-status-error";
  const Icon = type === "success" ? CheckCircle : AlertCircle;
  
  return (
    <div className={`mb-3 bg-white border-l-4 ${borderColor} p-4 shadow-md rounded-r-md w-80`}>
      <div className="flex items-center">
        <Icon className={`${iconColor} h-5 w-5 mr-3`} />
        <div>
          <p className={`font-medium ${titleColor}`}>{title}</p>
          <p className="text-sm text-neutral-700">{message}</p>
        </div>
        <button
          className="ml-auto text-neutral-700 hover:text-neutral-900"
          onClick={() => dismiss(id)}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default Toast;
