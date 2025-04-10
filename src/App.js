import React, {Fragment, useEffect, useState, useCallback, useRef} from 'react';
import {shallowEqual, useDispatch, useSelector} from 'react-redux';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import Alert from 'react-bootstrap/Alert';
import Spinner from 'react-bootstrap/Spinner';
import {SlideDown} from 'react-slidedown'
import 'react-slidedown/lib/slidedown.css'
import {callStatus, dial, dtmf, getAccounts, getSoftphoneStatus, hangUp, hold, loginSync, logout, unHold, updateCallStatus} from './actions';
import {ToastContainer, Bounce} from 'react-toastify';
import logo from './logo.png';
import {CALL_TERMINATE, CONFIRMED, DISCONNECTED, LOADER, EARLY, LOCAL_HOLD} from './constant';
import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import "react-toastify/dist/ReactToastify.css";
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome'
import {faBackspace, faPauseCircle, faPhoneSlash, faPhoneSquare, faPlayCircle} from '@fortawesome/free-solid-svg-icons'
import {SoftphoneState} from './Enum.ts';
import {formattedCallerId, formattedDuration} from "./Utils";
import useWebSocket, { ReadyState } from 'react-use-websocket';

const Login = props => {
  const defaultPassword = process.env.REACT_APP_SIP_PASSWORD;
  const [username, setUserName] = useState('');
  const [domain, setDomain] = useState("");
  const [password, setPassword] = useState(defaultPassword);
  const loading = useSelector(state => state.loading, shallowEqual);
  const dispatch = useDispatch();
  const onLogin = () => {
    const payload = {
      username,
      domain,
      password
    }
    dispatch(loginSync(payload))
  }
  return <section className="login-container">
    <Form className="login">
      <Form.Group controlId="username" onChange={e=>setUserName(e.target.value)}>
        <Form.Label>Username</Form.Label>
        <Form.Control type="text" placeholder="Your username" />
      </Form.Group>

      <Form.Group controlId="domain" onChange={e=>setDomain(e.target.value)}>
        <Form.Label>Domain</Form.Label>
        <Form.Control type="text" placeholder="Login domain" />
      </Form.Group>

      {defaultPassword === "" && 
      <Form.Group controlId="password" onChange={e=>setPassword(e.target.value)}>
        <Form.Label>Password</Form.Label>
        <Form.Control type="password" placeholder="Password" defaultValue={defaultPassword} />
      </Form.Group>
      }

      <Button variant="primary" onClick={onLogin} disabled={loading}>
        {loading && <Spinner
          as="span"
          animation="border"
          size="sm"
          role="status"
          aria-hidden="true"
          className="loading"
        />}
        <span>LOGIN</span>
      </Button>
    </Form>
    </section>
}


function MyAccount() {
  const dispatch = useDispatch();
  const loggedIn = useSelector(state => state.loggedIn, shallowEqual);
  const accountName = useSelector(state => state.accountName, shallowEqual);
  const selectAccount = useSelector(state => state.selectAccount, shallowEqual);
  const { active, status } = selectAccount || {}
  const message = active ? `Logged in as <b>${accountName}</b>, please logout if you are going to sign off.` : `Account: <b>${accountName}</b> - Status: <b>${status}</b>`;
  useEffect(()=>{
      dispatch(getAccounts());
      document.title = "Tinyphone UI"
  },[dispatch])
  return (
    <Fragment>
      {loggedIn &&  <Alert variant={active ? 'success' : 'danger'}>
        <span dangerouslySetInnerHTML={{__html: message}} />
      </Alert>}
    </Fragment>
  );
}


function WSEventStream() {
    const [socketUrl, setSocketUrl] = useState('ws://localhost:6060/events');
    const [messageHistory, setMessageHistory] = useState([]);
    const dispatch = useDispatch();

    const { sendMessage, lastMessage, readyState } = useWebSocket(socketUrl);
  
    useEffect(() => {
      if (lastMessage !== null) {
        dispatch(updateCallStatus(lastMessage))
        //dispatch(callStatus()); //quick hackdo it properly here.
        //emit a call event? 
        setMessageHistory((prev) => prev.concat(lastMessage));
      }
    }, [lastMessage, setMessageHistory]);
  
    const handleClickSendMessage = useCallback(() => sendMessage('Hello'), [sendMessage]);
  
    const connectionStatus = {
      [ReadyState.CONNECTING]: 'Connecting',
      [ReadyState.OPEN]: 'Open',
      [ReadyState.CLOSING]: 'Closing',
      [ReadyState.CLOSED]: 'Closed',
      [ReadyState.UNINSTANTIATED]: 'Uninstantiated',
    }[readyState];
  
    useEffect(() => {
        if (connectionStatus == ReadyState.OPEN){
            dispatch({type: LOADER,state: false})
        } else {
            dispatch({type: LOADER,state: true})
        }
    }, [readyState, dispatch, connectionStatus])


    return (
        <SlideDown> 
             <div >
            </div>  
        </SlideDown>
    );
  };

function Dialer() {
    const dispatch = useDispatch();
    const loading = useSelector(state => state.loading, shallowEqual);
    const inputRef = useRef(null);

    const [phoneNumber, setPhoneNumber] = useState("");
    const isCallDialed = useSelector(state => state.callDialed, shallowEqual);
    const accountName = useSelector(state => state.accountName, shallowEqual);
    const calls = useSelector(state => state.calls, shallowEqual);
    const domain = accountName.substring(accountName.lastIndexOf("@") + 1);
    const isCallsActive = calls.length > 0 ;

    function handleKeyPadPress(e) {
        //current state.
        //not on call
        if (!isCallsActive) {
            setPhoneNumber(phoneNumber.concat(e.target.name));
        } else {
            //oncall
            const call_id = calls[0].id
            sendDTMF(call_id, e.target.name);
        }
    }

    function clear() {
        if (phoneNumber.length > 0) {
            setPhoneNumber(phoneNumber.slice(0, -1));
          }
    }

    const dialNumber = () => {
        if (phoneNumber != "") {
            dispatch(dial("sip:" + phoneNumber));
            setPhoneNumber("");
        }   
    };

    const hangCall = (callId) => {
        dispatch(hangUp(callId));
    };

    const holdCall = (callId) => {
        dispatch(hold(callId));
    };

    const unHoldCall = (callId) => {
        dispatch(unHold(callId));
    };

    const pollCallStatus = () => {
        dispatch(callStatus());
    };

    const sendDTMF = (callId, chars) => {
        dispatch(dtmf(callId, chars));
    };

    const isOnHold = (call) => {
        let state = call != null ? call.state : '';
        let hold = call != null ? call.hold : '';

        switch (state) {
            case CONFIRMED:
                if (hold === LOCAL_HOLD) {
                    return true;
                } 
            default:
                return false;
        }
    }

    const renderState = (call) => {
        let state = call != null ? call.state : '';
        let hold = call != null ? call.hold : '';
        let call_id = call != null ? call.id : '';
        switch (state) {
            case EARLY:
            case "CALLING":
                return 'CALLING';
            case CONFIRMED:
                if (hold === LOCAL_HOLD) {
                    return 'ON HOLD';
                } 
                return 'CONNECTED';
            case DISCONNECTED:
            case "DISCONNCTD":
                dispatch({type: CALL_TERMINATE, call_id});
                return 'CALL ENDED';
            default:
                return '';
        }
    };

    useEffect(() => {
        let interval = null;
        if (isCallDialed) {
            interval = setInterval(() => {
                console.log("polling call status");
                //for clock update.Rending State
                pollCallStatus()
            }, 1000);
        } else {
            clearInterval(interval);
        }
        return () => clearInterval(interval);
    }, [isCallDialed]);

    useEffect(() => {
      if (inputRef.current) {
        const input = inputRef.current;
        
        if (input.scrollWidth > input.clientWidth) {
          input.classList.add('overflowing');
          input.scrollLeft = input.scrollWidth;
        } else {
          input.classList.remove('overflowing');
        }
      } 
    }, [phoneNumber]);




    return (
        <div className="dialer">
            <WSEventStream/>

            {calls.length > 0 && calls.map((call) => (
            <div key={call.id}>
                <SlideDown>
                    <div className="StatusArea">
                    <p>{formattedCallerId(call, domain)}</p>
                    <p>{formattedDuration(call.duration )}</p>
                    <p>{renderState(call, false)}</p>
                    </div>
                </SlideDown>
                <div className="functionArea">
                    <button className="functionButton" onClick={() => hangCall(call.id)}><FontAwesomeIcon icon={faPhoneSlash} size="2x" color="red"/></button>
                    {!isOnHold(call) ? <button className="functionButton" onClick={() => holdCall(call.id)} disabled={false}><FontAwesomeIcon icon={faPauseCircle} size="2x" color="#ffcd00"/></button> : <button className="functionButton" onClick={() => unHoldCall(call.id)} disabled={false}><FontAwesomeIcon icon={faPlayCircle} size="2x" color="#46b95a"/></button>}
                </div>
            </div>
            ))}

           
            <SlideDown><form><input type="display" value={phoneNumber} onChange={(ev) => setPhoneNumber(ev.target.value)}/></form></SlideDown>
           
            {loading && 
            <SlideDown>
                <div className="progress-loader">
                    <div className="indeterminate"></div>
                </div>
            </SlideDown>
            }

            <SlideDown>
                <div className="keypad">
                    <button className="button" name="1" onClick={handleKeyPadPress}>
                        1
                    </button>
                    <button className="button" name="2" onClick={handleKeyPadPress}>
                        2
                        <div className="sub-dig">ABC</div>
                    </button>
                    <button className="button" name="3" onClick={handleKeyPadPress}>
                        3
                        <div className="sub-dig">DEF</div>
                    </button>
                    <button className="button" name="4" onClick={handleKeyPadPress}>
                        4
                        <div className="sub-dig">GHI</div>
                    </button>
                    <button className="button" name="5" onClick={handleKeyPadPress}>
                        5
                        <div className="sub-dig">JKL</div>
                    </button>
                    <button className="button" name="6" onClick={handleKeyPadPress}>
                        6
                        <div className="sub-dig">MNO</div>
                    </button>
                    <button className="button" name="7" onClick={handleKeyPadPress}>
                        7
                        <div className="sub-dig">PQRS</div>
                    </button>
                    <button className="button" name="8" onClick={handleKeyPadPress}>
                        8
                        <div className="sub-dig">TUV</div>
                    </button>
                    <button className="button" name="9" onClick={handleKeyPadPress}>
                        9
                        <div className="sub-dig">WXYZ</div>
                    </button>
                    <button className="button" name="*" onClick={handleKeyPadPress}>
                        *
                    </button>
                    <button className="button" name="0" onClick={handleKeyPadPress}>
                        0
                        <div className="sub-dig">+</div>
                    </button>
                    <button className="button" name="#" onClick={handleKeyPadPress}>
                        #
                    </button>
                    <button className="functionButton" onClick={clear}>
                        <FontAwesomeIcon icon={faBackspace} size="3x" color="#ffcd00"/>
                    </button>
                    <button className="functionButton" onClick={dialNumber}
                            disabled={loading}><FontAwesomeIcon icon={faPhoneSquare} size="3x" color="#46b95a"/>
                    </button>
                </div>
            </SlideDown>
        </div>
    );
}


function App() {
  const dispatch = useDispatch();
  const loggedIn = useSelector(state => state.loggedIn, shallowEqual);
  const clientState = useSelector(state => state.clientState, shallowEqual)
  const accountName = useSelector(state => state.accountName, shallowEqual);
  const message =   `Please launch the softphone!`;
  useEffect(()=>{
      dispatch(getSoftphoneStatus());
      document.title = "Tinyphone UI"
  },[dispatch])
  return (
    <Fragment>
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick={false}
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
        transition={Bounce}
      />
      <header-nav>
        <nav className="navbar" style={{backgroundColor: "rgb(40, 116, 240)"}}>
            <div className="navbar-logo">
              <img width="200" src={logo} alt="Flipkart" title="Flipkart"/>
            </div>
            {
            loggedIn && <section>
                <span className="name">{accountName}</span>
                <Button variant="light" onClick={()=>dispatch(logout())}>Logout</Button>
              </section>
            }
        </nav>
      </header-nav>

            {clientState === SoftphoneState.Running && !loggedIn && <Login/>}
            {clientState === SoftphoneState.Running && loggedIn && <MyAccount/>}
            {clientState === SoftphoneState.Running && loggedIn && <Dialer/>}
   

      {clientState === SoftphoneState.NotRunning &&
        <section className="info-container">
          <Alert variant='warning' style={{ textAlign: 'center'}} >
            <span dangerouslySetInnerHTML={{__html: message}}/>
          </Alert>
        </section>
      }


    </Fragment>
  );
}

export default App;
