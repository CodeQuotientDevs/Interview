import { useCallback, useEffect } from 'react'
import { Alert } from '@/components/ui/alert'
import { CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { AlertType } from '@/constants'
import { useAppStore } from '@/store'

const getIcon = (type: AlertType) => {
	switch (type) {
		case AlertType.success:
			return <CheckCircle color='green' width={25} />;
		case AlertType.error:
			return <XCircle color='red' width={25} />;
		case AlertType.warning:
			return <AlertTriangle color='gold' width={25} />;
		default:
			return null;
	}
};

export default function AlertToast() {
	const alerts = useAppStore().alerts;
	const setAlert = useAppStore().setAlert;

	const intervalHandler = useCallback((alerts: Array<FinalAlert>) => {
		const currentTime = Date.now();
		const finalResult: Array<FinalAlert> = [];
		let isChangedDetected: boolean = false;
		alerts.forEach((alert) => {
			const element = { ...alert };
			if (currentTime < element.showUpto) {
				if (element.show == false) {
					element.show = true;
					isChangedDetected = true;
				}
				return finalResult.push(element)
			}
			if (currentTime > element.showUpto) {
				if (element.show == true) {
					isChangedDetected = true;
					element.show = false;
				}
			}
			if (currentTime <= (element.showUpto + 10 * 1000 )) {
				finalResult.push(element);
			}
		}, []);
		return [finalResult, isChangedDetected || (alerts.length !== finalResult.length)] as const;
	}, []);

	useEffect(() => {
		if (!alerts.length) {
			return;
		}
		const intervalId = setInterval(() => {
			const [newAlerts, changeDetected] = intervalHandler(alerts);
			if (changeDetected) {
				setAlert(newAlerts);
			}
		}, 400);
		return () => {
			clearTimeout(intervalId)
		}
	}, [alerts, intervalHandler, setAlert]);

	return (
		<>
			<div className={`fixed top-5 right-5 bg-transparent h-fit w-[350px] z-[1000] pointer-events-none`}>
				{alerts.map((alert) => {
					return (
						<Alert
							style={{
								boxShadow: "0px 0px 10px rgba(0, 0, 0, 0.1)",
							}}
							key={alert.id}
							className={`${alert.show ? 'translate-x-0' : 'translate-x-[100%] opacity-0'
								} pointer-events-auto flex flex-row justify-center items-center gap-4 mb-5 border-none bg-white rounded-md py-4 px-6 w-fit ml-auto transition-all duration-300 ease-in-out`}
						>

							<div className='pl-4'>
								<div className='relative'>
									<div className='absolute top-[-2px] left-[-30px]'>
										{getIcon(alert.type)}
									</div>
									<p className="text-[16px]">{alert.title}</p>
								</div>
								{alert.message && (
									<p className="text-[14px] text-gray-600 pt-2">{alert.message}</p>
								)}
							</div>
						</Alert>

					)
				})}
			</div >
		</>
	)
}
