import {ReactChild, useCallback, useRef, useState} from 'react';
import {Toast} from "@elastic/eui/src/components/toast/global_toast_list";

type ToastType = "primary" | "success" | "warning" | "danger"

export type ToastUtils = {
	toasts: Toast[]
	addToast: (toastTitle: string, toastText: ReactChild, toastType?: ToastType) => void,
	dismissToast: (dismissedToast: Toast) => void
}

type ToastListHookArgs = {
	toastIdFactoryFn: (toastCount: number, toastType?: ToastType) => string
}

function useToastList(toastListArgs: ToastListHookArgs): ToastUtils {
	const [toasts, setToasts] = useState<Toast[]>([])
	const internalToastCountRef = useRef<number>(0)

	const addToast = useCallback((toastTitle: string, toastText: ReactChild, toastType?: ToastType) => {
		const generatedToastId = toastListArgs.toastIdFactoryFn(internalToastCountRef.current, toastType)
		internalToastCountRef.current += 1
		setToasts((oldToasts) => {
			return [
				...oldToasts,
				{
					id: generatedToastId,
					title: toastTitle,
					text: toastText,
					color: toastType
				}
			]
		})
	}, [setToasts])

	const dismissToast = useCallback((dismissedToast: Toast) => {
		setToasts((oldToasts) => {
			return oldToasts.filter((currentToast) => {
				return currentToast.id !== dismissedToast.id
			})
		})
	}, [setToasts])

	return {toasts, addToast, dismissToast}
}

export {
	useToastList
}