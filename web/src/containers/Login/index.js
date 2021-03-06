import React, { Component } from 'react';
import classnames from 'classnames';
import { connect } from 'react-redux';
import { SubmissionError, change } from 'redux-form';
import { bindActionCreators } from 'redux';
import { Link } from 'react-router';
import { isMobile } from 'react-device-detect';
import moment from 'moment';

import { performLogin, storeLoginResult, setLogoutMessage } from '../../actions/authAction';
import LoginForm, { FORM_NAME } from './LoginForm';
import { Dialog, OtpForm, IconTitle, Notification } from '../../components';
import { NOTIFICATIONS } from '../../actions/appActions';
import { errorHandler } from '../../components/OtpForm/utils';
import {
	FLEX_CENTER_CLASSES,
	ICONS
} from '../../config/constants';

import STRINGS from '../../config/localizedStrings';

let errorTimeOut = null;

const BottomLink = () => (
	<div className={classnames('f-1', 'link_wrapper')}>
		{STRINGS.LOGIN.NO_ACCOUNT}
		<Link to="/signup" className={classnames('blue-link')}>
			{STRINGS.LOGIN.CREATE_ACCOUNT}
		</Link>
	</div>
);

class Login extends Component {
	state = {
		values: {},
		otpDialogIsOpen: false,
		logoutDialogIsOpen: false,
		termsDialogIsOpen: false,
		depositDialogIsOpen: false,
		token: ''
	};

	componentDidMount() {
		if (this.props.logoutMessage) {
			this.setState({ logoutDialogIsOpen: true });
		}
	}
	componentWillReceiveProps(nextProps) {
		if (
			nextProps.logoutMessage &&
			nextProps.logoutMessage !== this.props.logoutMessage
		) {
			this.setState({ logoutDialogIsOpen: true });
		}
	}

	componentWillUnmount() {
		this.props.setLogoutMessage();
		if (errorTimeOut) {
			clearTimeout(errorTimeOut);
		}
	}

	redirectToHome = () => {
		this.props.router.replace('/account');
	};

	redirectToResetPassword = () => {
		this.props.router.replace('/reset-password');
	};

	redirectToService = (url) => {
		window.location.href = `https://${url}`;
	};

	getServiceParam = () => {
		let service = '';
		if (
			this.props.location &&
			this.props.location.query &&
			this.props.location.query.service
		) {
			service = this.props.location.query.service;
		} else if (
			window.location &&
			window.location.search &&
			window.location.search.includes('service')
		) {
			service = window.location.search.split('?service=')[1];
		}
		return service;
	};

	checkExchangeExpiry = (info = {}) => {
		if (info.status) {
			if (info.is_trial) {
				if (info.active) {
					if (info.expiry && moment().isAfter(info.expiry, 'second')) {
						this.navigateToExpiry();
					}
				} else {
					this.navigateToExpiry();
				}
			}
		} else {
			this.navigateToExpiry();
		}
	};

	navigateToExpiry = () => this.props.router.replace('/expired-exchange');

	// checkLogin = () => {
	// 	// const termsAccepted = localStorage.getItem('termsAccepted');
	// 	// if (!termsAccepted) {
	// 	// 	this.setState({ termsDialogIsOpen: true });
	// 	// } else {
	// 		this.redirectToHome();
	// 	// }
	// };

	onSubmitLogin = (values) => {
		const service = this.getServiceParam();
		if (service) {
			values.service = service;
		}
		return performLogin(values)
			.then((res) => {
				if (res.data.token)
					this.setState({ token: res.data.token });
				this.checkExchangeExpiry(this.props.info);
				// if ((!Object.keys(this.props.info).length) || (!this.props.info.active)
				// 	|| (this.props.info.is_trial && this.props.info.active 
				// 		&& moment().diff(this.props.info.created_at, 'seconds') > EXCHANGE_EXPIRY_SECONDS))
				// 	this.checkExpiryExchange();
				// else 
				if (res.data && res.data.callbackUrl)
					this.redirectToService(res.data.callbackUrl);
				else this.redirectToHome();
			})
			.catch((err) => {
				const _error =
					err.response && err.response.data
						? err.response.data.message
						: err.message;

				let error = {};
				errorTimeOut = setTimeout(() => {
					this.props.change(FORM_NAME, 'captcha', '');
				}, 5000);

				if (_error.toLowerCase().indexOf('otp') > -1) {
					this.setState({ values, otpDialogIsOpen: true });
					error._error = STRINGS.VALIDATIONS.OTP_LOGIN;
				} else {
					if (_error === 'User is not activated') {
						error._error = (STRINGS.VALIDATIONS.FROZEN_ACCOUNT);
					} else if (_error.indexOf('captcha') > -1) {
						error._error = (STRINGS.VALIDATIONS.CAPTCHA);
					} else {
						error._error = _error;
					}
					throw new SubmissionError(error);
				}
			});
	};

	onSubmitLoginOtp = (values) => {
		return performLogin(
			Object.assign({ otp_code: values.otp_code }, this.state.values)
		)
			.then((res) => {
				this.setState({ otpDialogIsOpen: false });
				if (res.data.token)
					this.setState({ token: res.data.token });
				this.checkExchangeExpiry(this.props.info);
				// if ((!Object.keys(this.props.info).length) || (!this.props.info.active)
				// 	|| (this.props.info.is_trial && this.props.info.active
				// 		&& moment().diff(this.props.info.created_at, 'seconds') > EXCHANGE_EXPIRY_SECONDS))
				// 	this.checkExpiryExchange();
				// else 
				if (res.data && res.data.callbackUrl)
					this.redirectToService(res.data.callbackUrl);
				else this.redirectToHome();
			})
			.catch(errorHandler);
	};

	onAcceptTerms = () => {
		localStorage.setItem('termsAccepted', true);
		if (this.state.token)
			storeLoginResult(this.state.token);
		this.setState({ termsDialogIsOpen: false})
		this.redirectToHome();
	};

	onCloseDialog = () => {
		this.setState({ otpDialogIsOpen: false });
	};

	onCloseLogoutDialog = () => {
		this.props.setLogoutMessage();
		this.setState({ logoutDialogIsOpen: false });
	};

	gotoWallet = () => {
		this.props.router.replace('/wallet');
		this.setState({ depositDialogIsOpen: false });
		localStorage.setItem('deposit_initial_display', true);
	};

	render() {
		const { logoutMessage, activeTheme, constants } = this.props;
		const { otpDialogIsOpen, logoutDialogIsOpen } = this.state;
		let path = constants.logo_path;
		if (activeTheme === 'dark') {
			path = constants.logo_black_path;
		}

		return (
			<div
				className={classnames(...FLEX_CENTER_CLASSES, 'flex-column', 'f-1')}
			>
				<div
					className={classnames(
						...FLEX_CENTER_CLASSES,
						'flex-column',
						'auth_wrapper',
						'w-100'
					)}
				>
					<IconTitle
						iconPath={path}
						text={STRINGS.LOGIN_TEXT}
						textType="title"
						underline={true}
						useSvg={false}
						isLogo={true}
						className="w-100 exir-logo"
						imageWrapperClassName="auth_logo-wrapper"
						subtitle={STRINGS.formatString(
							STRINGS.LOGIN.LOGIN_TO,
							STRINGS.APP_TITLE
						)}
						actionProps={{
							text: STRINGS.LOGIN.CANT_LOGIN,
							iconPath: ICONS.BLUE_ARROW_RIGHT,
							onClick: this.redirectToResetPassword,
							useSvg: true,
							showActionText: true
						}}
					/>
					<div
						className={classnames(
							...FLEX_CENTER_CLASSES,
							'flex-column',
							'auth_form-wrapper',
							'w-100'
						)}
					>
						<LoginForm
							onSubmit={this.onSubmitLogin}
							theme={activeTheme}
						/>
						{isMobile && <BottomLink />}
					</div>
				</div>
				{!isMobile && <BottomLink />}
				<Dialog
					isOpen={otpDialogIsOpen || logoutDialogIsOpen }
					label="otp-modal"
					onCloseDialog={this.onCloseDialog}
					shouldCloseOnOverlayClick={otpDialogIsOpen ? false : true}
					showCloseText={otpDialogIsOpen ? true : false}
					className="login-dialog"
					useFullScreen={isMobile}
					showBar={otpDialogIsOpen}
					theme={activeTheme}
				>
					{otpDialogIsOpen && <OtpForm onSubmit={this.onSubmitLoginOtp} />}
					{logoutDialogIsOpen && (
						<Notification
							type={NOTIFICATIONS.LOGOUT}
							onClose={this.onCloseLogoutDialog}
							data={{ message: logoutMessage }}
						/>
					)}
					{/* {termsDialogIsOpen && <TermsOfService onAcceptTerms={this.onAcceptTerms} />} */}
					{/* {depositDialogIsOpen && <DepositFunds gotoWallet={this.gotoWallet} />} */}
				</Dialog>
			</div>
		);
	}
}

const mapStateToProps = (store) => ({
	activeTheme: store.app.theme,
	logoutMessage: store.auth.logoutMessage,
	info: store.app.info,
	constants: store.app.constants
});

const mapDispatchToProps = (dispatch) => ({
	setLogoutMessage: bindActionCreators(setLogoutMessage, dispatch),
	change: bindActionCreators(change, dispatch)
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(Login);
