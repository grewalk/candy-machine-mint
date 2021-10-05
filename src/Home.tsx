import { useEffect, useState } from "react";
import styled from "styled-components";
import Countdown from "react-countdown";
import { Button, CircularProgress, Snackbar,Container,Grid,Typography,Card,CardContent} from "@material-ui/core";
import { withStyles } from '@material-ui/core/styles';
import Alert from "@material-ui/lab/Alert";

import * as anchor from "@project-serum/anchor";

import { LAMPORTS_PER_SOL } from "@solana/web3.js";

import { useAnchorWallet } from "@solana/wallet-adapter-react";
import { WalletDialogButton } from "@solana/wallet-adapter-material-ui";

import {
  CandyMachine,
  awaitTransactionSignatureConfirmation,
  getCandyMachineState,
  mintOneToken,
  shortenAddress,
} from "./candy-machine";

const ConnectButton = styled(WalletDialogButton)`font-size : 1.25rem`;

const CounterText = styled.span``; // add your styles here

const MintContainer = styled.div`text-align: center;`; // add your styles here

const MintButton = styled(Button)`font-size:1.25rem; color :#360837 `; // add your styles here

const LogoBar = styled.span`color: #ff38dc;
font-size: 3rem;`;

const MintCost = "1";

const TotalMintQty = "1000";

const LogoText =  styled.span`color: white;
font-family: Montserrat, sans-serif;
font-size: 3rem;
font-weight: bold;
letter-spacing: 5px;
margin: 0 10px;
text-decoration: none;"`;


const boxStyle = {background: "rgba(0,0,0,.5)",
  borderRadius: "8px"}

const SpecialCard = withStyles({
    root: {
      background: "rgba(0,0,0,.5)",
      color : "white",
      textAlign: "center",
      display: "grid"
    },
  })(Card);

export interface HomeProps {
  candyMachineId: anchor.web3.PublicKey;
  config: anchor.web3.PublicKey;
  connection: anchor.web3.Connection;
  startDate: number;
  treasury: anchor.web3.PublicKey;
  txTimeout: number;
}

const Home = (props: HomeProps) => {
  const [balance, setBalance] = useState<number>();
  const [isActive, setIsActive] = useState(false); // true when countdown completes
  const [isSoldOut, setIsSoldOut] = useState(false); // true when items remaining is zero
  const [isMinting, setIsMinting] = useState(false); // true when user got to press MINT

  const [itemsAvailable, setItemsAvailable] = useState(0);
  const [itemsRedeemed, setItemsRedeemed] = useState(0);
  const [itemsRemaining, setItemsRemaining] = useState<string>("Updating");

  const [alertState, setAlertState] = useState<AlertState>({
    open: false,
    message: "",
    severity: undefined,
  });

  const [startDate, setStartDate] = useState(new Date(props.startDate));

  const wallet = useAnchorWallet();
  const [candyMachine, setCandyMachine] = useState<CandyMachine>();

  const refreshCandyMachineState = () => {
    (async () => {
      if (!wallet) return;

      const {
        candyMachine,
        goLiveDate,
        itemsAvailable,
        itemsRemaining,
        itemsRedeemed,
      } = await getCandyMachineState(
        wallet as anchor.Wallet,
        props.candyMachineId,
        props.connection
      );

      setItemsAvailable(itemsAvailable);
      setItemsRemaining(itemsRemaining.toString() );
      setItemsRedeemed(itemsRedeemed);

      setIsSoldOut(itemsRemaining === 0);
      setStartDate(goLiveDate);
      setCandyMachine(candyMachine);
    })();
  };

  const onMint = async () => {
    try {
      setIsMinting(true);
      if (wallet && candyMachine?.program) {
        const mintTxId = await mintOneToken(
          candyMachine,
          props.config,
          wallet.publicKey,
          props.treasury
        );

        const status = await awaitTransactionSignatureConfirmation(
          mintTxId,
          props.txTimeout,
          props.connection,
          "singleGossip",
          false
        );

        if (!status?.err) {
          setAlertState({
            open: true,
            message: "Congratulations! Mint succeeded!",
            severity: "success",
          });
        
        } else {
          setAlertState({
            open: true,
            message: "Mint failed! Please try again!",
            severity: "error",
          });
        }
      }
    } catch (error: any) {
      let message = error.msg || "Minting failed! Please try again!";
      if (!error.msg) {
        if (error.message.indexOf("0x138")) {
        } else if (error.message.indexOf("0x137")) {
          message = `SOLD OUT!`;
        } else if (error.message.indexOf("0x135")) {
          message = `Insufficient funds to mint. Please fund your wallet.`;
        }
      } else {
        if (error.code === 311) {
          message = `SOLD OUT!`;
          setIsSoldOut(true);
        } else if (error.code === 312) {
          message = `Minting period hasn't started yet.`;
        }
      }

      setAlertState({
        open: true,
        message,
        severity: "error",
      });
    } finally {
      if (wallet) {
        const balance = await props.connection.getBalance(wallet.publicKey);
        setBalance(balance / LAMPORTS_PER_SOL);
      }
      setIsMinting(false);
      refreshCandyMachineState();
    }
  };

  useEffect(() => {
    (async () => {
      if (wallet) {
        const balance = await props.connection.getBalance(wallet.publicKey);
        setBalance(balance / LAMPORTS_PER_SOL);
      }
    })();
  }, [wallet, props.connection]);

  useEffect(refreshCandyMachineState, [
    wallet,
    props.candyMachineId,
    props.connection,
  ]);

  return (
    <main>

    <Container maxWidth="md">
        <Grid container  justifyContent="center" >
          <LogoBar>|</LogoBar><LogoText>SIGH DUCKS</LogoText><LogoBar>|</LogoBar>
        </Grid>

      <Grid container>
        <Grid style={boxStyle} item xs={8}  spacing={5}>
          <Typography variant="h6" component="h2">Ongoing mint with Candy Machine. No time limit! </Typography>
          <Typography variant="h6" component="h2">Connect your wallet.</Typography>
          <Typography variant="h6" component="h2">Each wallet approval is an attempt to mint!</Typography>
        </Grid>

        <Grid item xs={4} spacing={5}>
          <SpecialCard>
            <CardContent>
              <Typography gutterBottom variant="h5" component="h2">Authority</Typography>
              <Typography variant="body1" ><span style={{float: "left"}}>Candy Machine: </span> <a href={"https://solscan.io/account/" + process.env.REACT_APP_CANDY_MACHINE_ID }  style={{float: "right"}}  target="_blank" rel="noopener noreferrer" >{shortenAddress(process.env.REACT_APP_CANDY_MACHINE_ID || "")}</a></Typography>  
              <Typography variant="body1" ><span style={{float: "left"}}>Config:  </span>   <a href={"https://solscan.io/account/" + process.env.REACT_APP_CANDY_MACHINE_CONFIG } style={{float: "right"}}  target="_blank" rel="noopener noreferrer">{shortenAddress(process.env.REACT_APP_CANDY_MACHINE_CONFIG || "")}</a></Typography>
            </CardContent>
          </SpecialCard>

          
        </Grid>
      </Grid>

      <Grid container spacing={4}>
        {/* <Grid item xs={6}>
          <SpecialCard>
            <CardContent>
              <Countdown
                        date={startDate}
                        onMount={({ completed }) => completed && setIsActive(true)}
                        onComplete={() => setIsActive(true)}
                        renderer={renderCounter}
              />
              </CardContent>
            </SpecialCard>

        </Grid>*/}

        <Grid item xs={12}>
          <Grid container spacing={1}>
            <Grid  item xs={4} justifyContent="center" spacing={4}>
             <SpecialCard>
                <CardContent>
                  <Typography gutterBottom variant="h5" component="h2">Price</Typography>
                  <Typography variant="body2"  component="p" >{MintCost} SOL</Typography>
                </CardContent>
              </SpecialCard>
            </Grid>
            <Grid item xs={4} justifyContent="center" spacing={4}>
              <SpecialCard>
                <CardContent>
                  <Typography gutterBottom variant="h5" component="h2">Available</Typography>
                  <Typography variant="body2" component="p" >{itemsRemaining}</Typography>
                </CardContent>
              </SpecialCard>
            </Grid>
            <Grid item xs={4} justifyContent="center"  spacing={4}>
              <SpecialCard>
                <CardContent>
                  <Typography gutterBottom variant="h5" component="h2">Total</Typography>
                  <Typography variant="body2" component="p">{TotalMintQty}</Typography>
                </CardContent>
              </SpecialCard>
            </Grid>
          </Grid>
          
        </Grid>
      </Grid>

      {/* 
      {wallet && (
        <p>Wallet {shortenAddress(wallet.publicKey.toBase58() || "")}</p>
      )}

      {wallet && <p>Balance: {(balance || 0).toLocaleString()} SOL</p>}

      {wallet && <p>Total Available: {itemsAvailable}</p>}

      {wallet && <p>Redeemed: {itemsRedeemed}</p>}

      {wallet && <p>Remaining: {itemsRemaining}</p>}*/}

      <MintContainer>
        {!wallet ? (
          <ConnectButton>Connect Wallet</ConnectButton>
        ) : (
          <MintButton
            disabled={isSoldOut || isMinting || !isActive}
            onClick={onMint}
            variant="contained"
          >
            {isSoldOut ? (
              "SOLD OUT"
            ) : isActive ? (
              isMinting ? (
                <CircularProgress />
              ) : (
                "MINT"
              )
            ) : (
              <SpecialCard>
            <CardContent>
              <Countdown
                        date={startDate}
                        onMount={({ completed }) => completed && setIsActive(true)}
                        onComplete={() => setIsActive(true)}
                        renderer={renderCounter}
              />
              </CardContent>
            </SpecialCard>
            )}
          </MintButton>
        )}
      </MintContainer>
      </Container >

      <Snackbar
        open={alertState.open}
        autoHideDuration={6000}
        onClose={() => setAlertState({ ...alertState, open: false })}
      >
        <Alert
          onClose={() => setAlertState({ ...alertState, open: false })}
          severity={alertState.severity}
        >
          {alertState.message}
        </Alert>
      </Snackbar>
    </main>
  );
};

interface AlertState {
  open: boolean;
  message: string;
  severity: "success" | "info" | "warning" | "error" | undefined;
}

const renderCounter = ({ days, hours, minutes, seconds, completed }: any) => {
  return (
    <Typography gutterBottom variant="h5" component="h1">
      <CounterText>
        {hours + (days || 0) * 24} hours, {minutes} minutes, {seconds} seconds
      </CounterText>
    </Typography>
  );
};

export default Home;
