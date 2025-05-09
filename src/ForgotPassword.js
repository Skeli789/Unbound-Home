
import React, {Component} from 'react';
import {Button, Form, OverlayTrigger, Tooltip} from "react-bootstrap";
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

import {NO_SERVER_CONNECTION_ERROR, ErrorPopUp, SendFormToServer,
        ValidateEmail, ValidatePassword} from "./FormUtil";
import {STATE_LOGIN} from "./MainPage";
import {GetDefaultPopUpOpts} from "./Notifications";
import {CodeField} from './subcomponents/CodeField';
import {EmailField} from "./subcomponents/EmailField";
import {PasswordField} from "./subcomponents/PasswordField";

import {AiOutlineCheckCircle, AiOutlineMail} from "react-icons/ai";

import "./stylesheets/Form.css";

const FP_STATE_ENTER_EMAIL = 1;
const FP_STATE_ENTER_NEW_PASSWORD = 2;

const ERROR_MESSAGES =
{
    "": "",
    INVALID_EMAIL: "No account for that email was found!",
    INVALID_RESET_CODE: "Incorrect password reset code!\nCheck your email and try again.",
    INVALID_PASSWORD: "Password must be between 6 and 20 characters!",
    MISMATCHED_PASSWORDS: "Passwords don't match!",
    RESET_CODE_TOO_OLD: "The password reset code has expired!\nPlease reload the page and try again.",
    PASSWORD_RESET_COOLDOWN: "Please wait at least an hour before trying to reset your password again.",
    NULL_ACCOUNT: "The details were wiped before reaching the server!",
    BLANK_INPUT: "Missing required (*) field!",
    UNKNOWN_ERROR: "An unknown server error occurred! Please try again later.",
    NO_SERVER_CONNECTION: NO_SERVER_CONNECTION_ERROR,
};
const CODE_LENGTH = 6;
const SEND_CODE_COOLDOWN = 2 * 60 * 1000; //2 Minutes
const PopUp = withReactContent(Swal);


export class ForgotPassword extends Component
{
    /**
     * Sets up the forgot password page.
     */
    constructor(props)
    {
        super(props);

        this.state =
        {
            forgotPasswordState: FP_STATE_ENTER_EMAIL,
            emailInput: "",
            codeInput: "",
            passwordInput: "",
            confirmPasswordInput: "",
            showPassword: false,
            showedErrorPopUp: false,
            errorMsg: "",
        }

        this.mainPage = props.mainPage;
    }

    /**
     * Gets the main page component.
     * @returns {Component} The main page component.
     */
    getMainPage()
    {
        return this.mainPage;
    }
 
    /**
     * Checks if both password fields in the form are filled.
     * @returns {Boolean} true if both password fields are filled, false if they're not.
     */
    bothPasswordsFilled()
    {
        return this.state.passwordInput !== ""
            && this.state.confirmPasswordInput !== "";
    }

    /**
     * Ensures all necessary fields in the form are filled.
     * @returns {Boolean} true if all required fields are filled, false otherwise.
     */
    allRequiredFieldsFilled()
    {
        return this.state.codeInput !== ""
            && this.state.emailInput !== ""
            && this.bothPasswordsFilled();
    }

    /**
     * Checks if the code entered in the form could be a valid activation code.
     * @returns {Boolean} true if the entered code is valid, false if it's not.
     */
    validCode()
    {
        return this.state.codeInput.length === CODE_LENGTH;
    }

    /**
     * Checks if the email entered in the form is a valid email.
     * @returns {Boolean} true if the entered email is valid, false if it's not.
     */
    validEmail()
    {
        return ValidateEmail(this.state.emailInput);
    }

    /**
     * Checks if the password entered in the form is a valid password.
     * @returns {Boolean} true if the entered password is valid, false if it's not.
     */
    validPassword()
    {
        return ValidatePassword(this.state.passwordInput);
    }
 
    /**
     * Checks if the two passwords entered into the form are identical.
     * @returns {Boolean} true if the entered passwords are identical, false if they're not.
     */
    passwordsMatch()
    {
        return this.state.passwordInput === this.state.confirmPasswordInput;
    }
 
    /**
     * Gets the error message (if present) at the time of submitting an email to receive a code.
     * @returns {String} The error message symbol.
     */
    getErrorMessageForSendingCode()
    {
        var errorMsg = "";
    
        if (!this.validEmail())
            errorMsg = "INVALID_EMAIL";
        else if ("lastTimeSentPasswordResetCode" in localStorage) //Prevent spamming code
        {
            var timeSince = Date.now() - localStorage.lastTimeSentPasswordResetCode;
            if (timeSince < SEND_CODE_COOLDOWN)
            {
                var timeRemaining = Math.ceil((SEND_CODE_COOLDOWN - timeSince) / 1000);
                errorMsg = `Please wait ${timeRemaining} seconds before sending another code.`;
            }
        }

        return errorMsg;
    }

    /**
     * Gets the error message (if present) at the time of the changing password form submission.
     * @returns {String} The error message symbol.
     */
    getErrorMessageForChangingPassword()
    {
        var errorMsg = "";

        if (!this.allRequiredFieldsFilled())
            errorMsg = "BLANK_INPUT";
        else if (!this.validEmail())
            errorMsg = "INVALID_EMAIL";
        else if (!this.validCode())
            errorMsg = "INVALID_RESET_CODE";
        else if (!this.validPassword())
            errorMsg = "INVALID_PASSWORD";
        else if (!this.passwordsMatch())
            errorMsg = "MISMATCHED_PASSWORDS";

        return errorMsg;
    }

    /**
     * Sends the user an email with a code that can be used to reset their password.
     * @param {Object} e - The default event for submitting a form.
     */
    async sendForgotPasswordCode(e)
    {
        e.preventDefault(); //Prevent page reload
        var errorMsg = this.getErrorMessageForSendingCode();

        if (errorMsg === "") //No error
        {
            const requestData = {email: this.state.emailInput};
            await SendFormToServer(requestData, this, this.mainPage, "/sendPasswordResetCode", this.passwordResetCodeSentPopUp.bind(this));
        }
        else
        {
            this.setState({errorMsg: errorMsg});
            this.errorPopUp(errorMsg);
        }
    }

    /**
     * Displays a pop-up that a code was sent to the user's email and then advances the state.
     */
    passwordResetCodeSentPopUp(mainPageObj, response) //Args unused
    {
        localStorage.lastTimeSentPasswordResetCode = Date.now();
        PopUp.fire
        ({
            icon: "success",
            title: "Check your inbox or spam for the code needed to reset your password!",
            confirmButtonText: "Continue",
            ...GetDefaultPopUpOpts(),
        }).then(() =>
        {
            this.setState({forgotPasswordState: FP_STATE_ENTER_NEW_PASSWORD});
        });
    }

    /**
     * Pastes the text on the clipboard into the submission field and automatically
     * submits it if it could be a valid code.
     */
    pasteCode()
    {
        navigator.clipboard.readText().then((text) =>
        {
            this.setState({codeInput: text});
        }).catch((err) => {
            this.errorPopUp("Failed to read clipboard contents! Please paste manually.");
        });
    }

    /**
     * Submits the reset password.
     * @param {Object} e - The default event for submitting a form.
     */
    async submitPasswordReset(e)
    {
        if (e != null)
            e.preventDefault(); //Prevent page reload

        var errorMsg = this.getErrorMessageForChangingPassword();

        if (errorMsg === "") //No error
        {
            const requestData =
            {
                email: this.state.emailInput,
                resetCode: this.state.codeInput,
                newPassword: this.state.passwordInput,
            };

            await SendFormToServer(requestData, this, this.mainPage, "/resetPassword", this.completedPasswordResetPopUp.bind(this));
        }
        else
        {
            this.setState({errorMsg: errorMsg});
            this.errorPopUp(errorMsg);
        }
    }
 
    /**
     * Processes the response from the server after logging in.
     * @param {Object} mainPageObj - The this object from MainPage.js.
     * @param {Objecy} response - The response object from the server.
     */
    completedPasswordResetPopUp(mainPageObj, response) //Second arg unused
    {
        PopUp.fire
        ({
            icon: "success",
            title: "Password reset successfully!",
            ...GetDefaultPopUpOpts(),
        }).then(() =>
        {
            mainPageObj.setState
            ({
                editState: STATE_LOGIN,
            });
        });
    }

    /**
     * Displays an error pop-up.
     * @param {String} errorSymbol - The error symbol for the message to be shown on the pop-up.
     */
    errorPopUp(errorSymbol)
    {
        var text = (errorSymbol in ERROR_MESSAGES) ?  ERROR_MESSAGES[errorSymbol] : errorSymbol;
        ErrorPopUp(text);
    }

    /**
     * Prints the page where the user can enter their email to receive a code that can be used to reset their password.
     * @returns {JSX} The enter email and send code page.
     */
    renderSendForgotPasswordCode()
    {
        const sendCodeTooltip = props => (<Tooltip {...props}>Send Code</Tooltip>);

        return (
            <div className="form-page" id="forgot-password-form">
                <Form onSubmit={(e) => this.sendForgotPasswordCode(e)}>
                    <h1 className="form-title">I forgot my password!</h1>
                    <p className="form-desc">Enter your email to receive a code to reset your password.</p>

                    {/*Email Input*/}
                    <EmailField
                        email={this.state.emailInput}
                        setParentEmail={(email) => this.setState({emailInput: email})}
                    />

                    {/* Send Code Button */}
                    <div className="submit-form-button-container">
                        <OverlayTrigger placement="bottom" overlay={sendCodeTooltip}>
                            <Button size="lg" className="submit-form-button" id="send-code-button"
                                    type="submit" aria-label="Send Code">
                                    <AiOutlineMail size={42}/>
                            </Button>
                        </OverlayTrigger>
                    </div>
                </Form>
                
                {/*Redirect to Login Page Button*/}
                <p className="already-have-account-container">
                    {"Remembered your password? "}
                    <span className="already-have-account-button"
                            id="switch-to-login-button"
                            onClick={() => this.getMainPage().setState({editState: STATE_LOGIN})} >
                        Log in to your account.
                    </span>
                </p>
            </div>
        );
    }

    /**
     * Prints the page where the user can submit a form to actually change their password.
     * @returns {JSX} The enter new password page.
     */
    renderChangePassword()
    {
        const showPasswordFunc = () => this.setState({showPassword: !this.state.showPassword});

        return (
            <div className="form-page" id="reset-password-form">
                <h1 className="form-title">I forgot my password!</h1>
                <p className="form-desc">Enter your new password and the code sent to your email.</p>

                <Form onSubmit={(e) => this.submitPasswordReset(e)}>
                    {/*Email Input*/}
                    <EmailField
                        email={this.state.emailInput}
                        disabled={true} //Should have been set earlier
                    />

                    {/*Code Input*/}
                    <CodeField
                        code={this.state.codeInput}
                        codeLength={CODE_LENGTH}
                        fieldPrefix="Password Reset"
                        setParentCode={(code) => this.setState({codeInput: code})}
                    />

                    {/*New Password Input*/}
                    <PasswordField
                        password={this.state.passwordInput}
                        fieldPrefix="New"
                        setParentPassword={(password) => this.setState({passwordInput: password})}
                        showParentPassword={() => this.state.showPassword}
                        toggleShowParentPassword={showPasswordFunc}
                        showError={() => this.state.passwordInput !== "" && !this.validPassword()}
                    />

                    {/*Confirm Password Input*/}
                    <PasswordField
                        password={this.state.confirmPasswordInput}
                        fieldPrefix="Confirm"
                        isConfirmPassword={true}
                        setParentPassword={(password) => this.setState({confirmPasswordInput: password})}
                        showParentPassword={() => this.state.showPassword}
                        toggleShowParentPassword={showPasswordFunc}
                        showError={() => this.bothPasswordsFilled() && !this.passwordsMatch()}
                    />

                    {/* Submit Button */}
                    <div className="submit-form-button-container">
                        <Button size="lg" className="submit-form-button" type="submit">
                            <AiOutlineCheckCircle size={42}/>
                        </Button>
                    </div>
                </Form>
            </div>
        );
    }

   /**
    * Prints the forgot password page. 
    */
    render()
    {
        if (this.state.forgotPasswordState === FP_STATE_ENTER_EMAIL)
            return this.renderSendForgotPasswordCode();

        return this.renderChangePassword();
    }
}
