import { Component } from "react";
import { FiAlertTriangle, FiRefreshCcw } from "react-icons/fi";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);

    this.state = {
      hasError: false,
      error: null,
    };
  }
}
