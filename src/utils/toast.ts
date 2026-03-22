import toast from 'react-hot-toast';

type ToastType = 'success' | 'error' | 'info';

/**
 * showToast – global flash/toast utility
 * @param message  The message to display
 * @param type     'success' | 'error' | 'info'  (default: 'info')
 */
export const showToast = (message: string, type: ToastType = 'info'): void => {
  switch (type) {
    case 'success':
      toast.success(message);
      break;
    case 'error':
      toast.error(message);
      break;
    default:
      toast(message);
  }
};
