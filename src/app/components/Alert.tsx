type AlertProps = {
  message: string;
  onClose: () => void;
};

export const Alert = ({ message, onClose }: AlertProps) => (
  <div className="fixed bottom-0 left-0 flex w-full bg-red-500/90">
    <p className="text-white flex-1 p-2">{message}</p>
    <button onClick={onClose} className="bg-white/50 aspect-square w-8">
      X
    </button>
  </div>
);
