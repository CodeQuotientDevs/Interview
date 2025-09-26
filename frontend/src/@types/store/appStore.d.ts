
interface SingleAlert {
  title: string,
  message?: string,
  type: AlertType,
  time: number,
}

interface FinalAlert {
  id: string,
  title: string,
  message?: string,
  type: AlertType,
  showUpto: number,
  show: boolean,
}

