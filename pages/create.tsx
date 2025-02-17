import type { NextPage } from "next";
import Router from "next/router";
import * as React from "react";

import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  FormControl,
  Grid,
  InputLabel,
  Link,
  MenuItem,
  Paper,
  Select,
  Stack,
  Step,
  StepContent,
  StepLabel,
  Stepper,
  TextField,
  Typography,
} from "@mui/material";

import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DesktopDatePicker } from "@mui/x-date-pickers/DesktopDatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";

import DriveFileRenameOutlineIcon from "@mui/icons-material/DriveFileRenameOutline";
import LocalPoliceIcon from "@mui/icons-material/LocalPolice";
import RequestQuoteIcon from "@mui/icons-material/RequestQuote";
import StickyNote2OutlinedIcon from "@mui/icons-material/StickyNote2Outlined";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import WalletIcon from "@mui/icons-material/Wallet";

import Diversity3Icon from "@mui/icons-material/Diversity3";
import TocIcon from "@mui/icons-material/Toc";
import { BigNumber, ethers } from "ethers";
import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import CreateAgreementStatus from "../components/CreateAgreement/CreateAgreementStatus";
import SnackbarAlert from "../components/general/SnackbarAlert";
import ContractfulHtmlHead from "../components/HtmlHead";
import { deployments } from "../deployments";
import useCoordinateCreateAgreement from "../hooks/useCoordinateCreateAgreement";
import useGetEstablishmentFeeRate from "../hooks/useGetEstablishmentFeeRate";
import useGetPenalizationAmount from "../hooks/useGetPenalizationAmount";
import { Address } from "../utils/types";

const CreateHiringAgreement: NextPage = () => {
  const { address } = useAccount();
  // hard-coded for now
  const [selectedToken, setSelectedToken] = useState<Address>(
    "0x10055ef62E88eF68b5011F4c7b5Ab9B99f00BB40"
  );
  const [openStatusesDialog, setOpenStatusesDialog] = useState<boolean>(false);
  const [openSnackbarAlert, setOpenSnackbarAlert] = useState<boolean>(false);
  const [snackbarAlertSeverity, setSnackbarAlertSeverity] = useState<
    "success" | "info" | "warning" | "error"
  >();

  const [desc, setDesc] = useState<string>();

  const { data: penalizationAmount } = useGetPenalizationAmount();
  const { data: establishmentFeeRate } = useGetEstablishmentFeeRate();

  const {
    coordinateCreateAgreement,
    reset,
    isError,
    errorMessage,
    isTokenApprovePendingSignature,
    isTokenApproveMining,
    isTokenApproveSuccess,
    isCreateAgreementPendingSignature,
    isCreateAgreementMining,
    isCreateAgreementSuccess,
  } = useCoordinateCreateAgreement();

  const manager = deployments.contracts.Manager;

  const handleCreateAgreementSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setOpenSnackbarAlert(false);
    reset();
    if (!address) {
      setSnackbarAlertSeverity("error");
      setOpenSnackbarAlert(true);
      return;
    }

    // deconstruct form data
    const {
      beginningDate,
      engagementPeriod,
      paymentCycleDuration,
      hourlyRate,
      contractor,
    } = e.target as typeof e.target & {
      acceptancePeriod: { value: string };
      beginningDate: { value: string };
      engagementPeriod: { value: string };
      paymentCycleDuration: { value: string };
      hourlyRate: { value: string };
      contractor: { value: Address };
    };

    const sendDesc = fetch("/api/sendDesc", {
      method: "POST",
      mode: "cors",
      body: JSON.stringify({ desc: desc }),
      headers: { "Content-Type": "application/json" },
    });

    sendDesc
      .then((response) => {
        if (!response.ok) {
          console.error("Error ", response.status);
        } else if (response.status >= 400) {
          console.error(
            "HTTP Error: " + response.status + " - " + response.json()
          );
        } else {
          return response.json();
        }
      })
      .then((data) => {
        const cid = data?.cid;

        const nowDateTime = new Date();
        const parsedPaymentCycleDuration = parseInt(paymentCycleDuration.value);
        const parsedBeginningDate = Date.parse(beginningDate.value);
        const dateBeginningDate = new Date(beginningDate.value);
        const tratedBeginningDate =
          parsedPaymentCycleDuration > 24 * 60 * 60
            ? parsedBeginningDate
            : dateBeginningDate.getFullYear() == nowDateTime.getFullYear() &&
              dateBeginningDate.getMonth() == nowDateTime.getMonth() &&
              dateBeginningDate.getDay() == nowDateTime.getDay()
            ? nowDateTime.getTime()
            : parsedBeginningDate;

        coordinateCreateAgreement(
          selectedToken,
          {
            beginningDate: BigNumber.from(
              Math.round(tratedBeginningDate / 1000)
            ),
            maturityDate: BigNumber.from(
              Math.round(
                tratedBeginningDate / 1000 +
                  parseInt(engagementPeriod.value) * (24 * 60 * 60) * 30
              ) // months
            ),
            paymentCycleDuration: BigNumber.from(
              Math.round(parseInt(paymentCycleDuration.value))
            ),
            paymentCycleAmount: BigNumber.from(
              Math.round(
                parseInt(hourlyRate.value) *
                  DAYS_PER_PAYMENT_PERIOD *
                  WORKING_HOURS_PER_DAY
              )
            ).mul(BigNumber.from(10).pow(BigNumber.from(18))),
            underlayingToken: selectedToken,
            contractor: contractor.value,
            descriptionURI: cid.toString(),
          },
          manager.address,
          ethers.constants.MaxUint256
        );
      });

    setOpenStatusesDialog(true);
  };

  const handleCloseCreateAgreementStatuses = (
    e: React.MouseEvent<HTMLElement>
  ) => {
    if (isError || isCreateAgreementSuccess || !address) {
      setOpenStatusesDialog(false);
    }

    if (isCreateAgreementSuccess) {
      Router.push("/review");
    }
  };

  useEffect(() => {
    if (isError) {
      setSnackbarAlertSeverity("error");
      setOpenSnackbarAlert(true);
    }
    if (isCreateAgreementSuccess) {
      setSnackbarAlertSeverity("success");
      setOpenSnackbarAlert(true);
    }
  }, [isCreateAgreementSuccess, isError]);

  // Helper (e.g. completion state of the Stepper)

  const isWalletConnected = () => {
    return address !== undefined;
  };

  // Model state and constants
  // TODO: move to a separate file

  const PAYMENT_TERMS_2WEEKS = 14 * 24 * 60 * 60;
  const DAYS_PER_PAYMENT_PERIOD = 10;
  const WORKING_HOURS_PER_DAY = 8;

  const [startDate, setStartDate] = useState<Date>(new Date());
  const [budget, setBudget] = useState<Number | null>(null);
  const [workingCommitment, setWorkingCommitment] = useState<Number>(40);

  const amountFormatter = new Intl.NumberFormat("en-US", {
    // These options are needed to round to whole numbers if that's what you want.
    minimumFractionDigits: 2, // (this suffices for whole numbers, but will print 2500.10 as $2,500.1)
    maximumFractionDigits: 2, // (causes 2500.99 to be printed as $2,501)
  });

  // State of ConfirmDialog

  const [betaDialogOpen, setBetaDialogOpen] = React.useState(false);
  const betaDialogOk = () => {
    setBetaDialogOpen(false);
  };
  const showBetaDialog = () => {
    setBetaDialogOpen(true);
  };

  return (
    <>
      <ContractfulHtmlHead />

      <Container
        sx={{
          mt: 4,
        }}
      >
        <Typography variant="h6">
          👋 Welcome - start here to create and deploy your Hiring Agreement.
        </Typography>
      </Container>

      <form onSubmit={(e) => handleCreateAgreementSubmit(e)}>
        <Container
          sx={{
            mt: 4,
          }}
        >
          <Stepper
            activeStep={isWalletConnected() ? 1 : 0}
            orientation="vertical"
          >
            <Step key="1" active={true} completed={isWalletConnected()}>
              <StepLabel>Your Wallet</StepLabel>
              <StepContent>
                <Grid container pt={2} pl={3}>
                  <Grid item xs>
                    <Stack direction="column">
                      {isWalletConnected() ? (
                        <>
                          <Stack direction="row" spacing={1}>
                            <VerifiedUserIcon />
                            <Typography>Connected</Typography>
                            <Chip
                              label={address}
                              variant="outlined"
                              sx={{
                                mb: 1,
                              }}
                            />
                          </Stack>
                          <Typography pt={1}>
                            Please proceed to securely create a Hiring
                            Agreement.
                          </Typography>
                        </>
                      ) : (
                        <>
                          <Stack direction="row" spacing={1}>
                            <LocalPoliceIcon />
                            <Typography>
                              Please proceed to securely create a Hiring
                              Agreement. Start with connecting your Wallet.
                            </Typography>
                          </Stack>
                        </>
                      )}
                    </Stack>
                  </Grid>
                </Grid>
              </StepContent>
            </Step>

            <Step key="2" active={isWalletConnected()} completed={false}>
              <StepLabel>Contract</StepLabel>
              <StepContent>
                <Grid container pt={2} pl={3}>
                  <Grid item xs>
                    <Stack direction="row" spacing={1} mb={4}>
                      <StickyNote2OutlinedIcon />
                      <Typography>
                        Please fill in the details of the Hiring Agreement.
                      </Typography>
                    </Stack>

                    <Paper
                      elevation={12}
                      sx={{
                        mb: 4,
                      }}
                    >
                      <Box px={4} pt={4}>
                        <WalletIcon
                          sx={{
                            color: "action.active",
                            mr: 1,
                            mt: 2,
                          }}
                        />
                        <TextField
                          id="input-service-provider-addr"
                          label="Public Polygon Wallet address your contract partner"
                          variant="outlined"
                          sx={{
                            width: "80vh",
                          }}
                          name="contractor"
                          required
                        />
                      </Box>

                      <Box px={4} pt={4}>
                        <TocIcon
                          sx={{
                            color: "action.active",
                            mr: 1,
                            mt: 2,
                          }}
                        />
                        <TextField
                          id="contract-description"
                          name="description"
                          label="Detailed work and service deliverable description (plain text)"
                          multiline
                          rows={4}
                          sx={{
                            width: "80vh",
                          }}
                          onChange={(e) => {
                            setDesc(e.target.value);
                          }}
                          required
                        />
                      </Box>

                      <Stack px={4} pt={4} direction="row">
                        <Diversity3Icon
                          sx={{
                            color: "action.active",
                            mr: 1,
                            mt: 2,
                          }}
                        />
                        <Card
                          sx={{
                            width: "80vh",
                          }}
                          variant="outlined"
                        >
                          <CardContent>
                            <Typography
                              sx={{
                                mb: 1.5,
                              }}
                              color="text.secondary"
                              variant="h6"
                            >
                              This Hiring Agreement organizes a long-term
                              collaboration relationship.
                            </Typography>
                            <Typography variant="body2">
                              <ul>
                                <li style={{ paddingBottom: "3px" }}>
                                  The project underlying the Agreement is
                                  planned for several months (usually 3-6, or
                                  even more months).
                                </li>
                                <li style={{ paddingBottom: "3px" }}>
                                  The project is organized in 2 weeks sprint
                                  iterations.
                                </li>
                                <li style={{ paddingBottom: "3px" }}>
                                  Payment will be taken care of automatically,
                                  unless the Agreement will be canceled.
                                </li>
                              </ul>
                            </Typography>

                            <Divider />

                            <Typography
                              sx={{
                                my: 1.5,
                              }}
                              color="text.secondary"
                              variant="h6"
                            >
                              Contractual details of the arrangement:
                            </Typography>

                            <Stack
                              direction="row"
                              sx={{
                                alignItems: "flex-end",
                              }}
                            >
                              <Typography
                                sx={{
                                  width: "30%",
                                }}
                                variant="body2"
                              >
                                Engagement period
                                <br />
                                (30 days each):
                              </Typography>
                              <TextField
                                id="input-engagement-period"
                                name="engagementPeriod"
                                inputProps={{
                                  inputMode: "numeric",
                                  pattern: "[0-9]*",
                                }}
                                defaultValue="3"
                                label="Months"
                                type="number"
                                variant="standard"
                                required
                              />
                            </Stack>

                            <Stack
                              direction="row"
                              sx={{
                                alignItems: "flex-end",
                              }}
                              pt={4}
                            >
                              <Typography
                                sx={{
                                  width: "30%",
                                }}
                                variant="body2"
                              >
                                Engagement begins on:
                              </Typography>
                              <LocalizationProvider dateAdapter={AdapterDayjs}>
                                <DesktopDatePicker
                                  label="Date"
                                  disablePast={true}
                                  inputFormat="MM/DD/YYYY"
                                  value={startDate}
                                  onChange={(newDate) => {
                                    setStartDate(newDate as Date);
                                  }}
                                  renderInput={(params) => (
                                    <TextField
                                      name="beginningDate"
                                      variant="standard"
                                      required
                                      {...params}
                                    />
                                  )}
                                />
                              </LocalizationProvider>
                            </Stack>

                            <Stack
                              direction="row"
                              sx={{
                                alignItems: "flex-end",
                              }}
                              pt={4}
                            >
                              <Typography
                                sx={{
                                  width: "30%",
                                }}
                                variant="body2"
                              >
                                Working hours:
                              </Typography>

                              <FormControl sx={{ width: "50%" }}>
                                <InputLabel id="label-select-commitment">
                                  Commitment
                                </InputLabel>
                                <Select
                                  labelId="label-select-commitment"
                                  id="select-commitment"
                                  label="Commitment"
                                  variant="standard"
                                  value={workingCommitment}
                                  onChange={(e) => {
                                    e.target.value !== 40 && showBetaDialog();
                                    setWorkingCommitment(40);
                                  }}
                                  type="number"
                                  required
                                >
                                  <MenuItem value={40}>
                                    Full-time: 40 hours per week
                                  </MenuItem>
                                  <MenuItem value={20}>
                                    Part-time: 20 hours per week
                                  </MenuItem>
                                </Select>
                              </FormControl>
                            </Stack>
                          </CardContent>
                        </Card>
                      </Stack>

                      <Stack p={4} direction="row">
                        <RequestQuoteIcon
                          sx={{
                            color: "action.active",
                            mr: 1,
                            mt: 4,
                          }}
                        />
                        <Card
                          sx={{
                            width: "80vh",
                          }}
                          variant="outlined"
                        >
                          <CardContent>
                            <Typography
                              sx={{
                                my: 1.5,
                              }}
                              color="text.secondary"
                              variant="h6"
                            >
                              Financial arrangement of the Hiring Agreement:
                            </Typography>

                            <Stack
                              direction="row"
                              sx={{
                                alignItems: "flex-end",
                              }}
                            >
                              <Typography
                                sx={{
                                  width: "30%",
                                }}
                                variant="body2"
                              >
                                Compensation:
                              </Typography>

                              <TextField
                                id="input-service-provider-addr"
                                name="hourlyRate"
                                label="Hourly rate"
                                variant="standard"
                                inputProps={{
                                  inputMode: "numeric",
                                  pattern: "[0-9]*.",
                                }}
                                type="number"
                                sx={{
                                  width: "30%",
                                }}
                                onBlur={(e) => {
                                  const rateUSD = Number(e.target.value);
                                  if (!isNaN(rateUSD)) {
                                    setBudget(
                                      rateUSD *
                                        DAYS_PER_PAYMENT_PERIOD *
                                        WORKING_HOURS_PER_DAY
                                    );
                                  } else {
                                    setBudget(null);
                                  }
                                }}
                                required
                              />
                              <Typography pl={4}>US$ (in DAI)</Typography>
                            </Stack>

                            <Stack
                              direction="row"
                              sx={{
                                alignItems: "flex-end",
                              }}
                              py={4}
                            >
                              <Typography
                                sx={{
                                  width: "30%",
                                }}
                                variant="body2"
                              >
                                Payment terms:
                              </Typography>

                              <FormControl sx={{ width: "70%" }}>
                                <InputLabel id="label-select-commitment">
                                  Terms
                                </InputLabel>
                                <Select
                                  labelId="label-select-commitment"
                                  id="select-commitment"
                                  name="paymentCycleDuration"
                                  label="Commitment"
                                  variant="standard"
                                  type="number"
                                  defaultValue={14 * 60}
                                  required
                                >
                                  <MenuItem value={14 * 60}>
                                    <b style={{ color: "#d32f2f" }}>TESTING:</b>{" "}
                                    Payment in 14 minutes (imitating 2 weeks)
                                  </MenuItem>
                                  <MenuItem value={PAYMENT_TERMS_2WEEKS}>
                                    Payment every 2 weeks (after successful
                                    sprint review)
                                  </MenuItem>
                                </Select>
                              </FormControl>
                            </Stack>

                            <Divider />

                            <Stack direction="row" pt={3}>
                              <Typography
                                variant="body2"
                                sx={{
                                  width: "30%",
                                  display: "flex",
                                  alignItems: "center",
                                }}
                              >
                                Resulting contract budget:
                              </Typography>
                              <Typography variant="h6">
                                {budget
                                  ? amountFormatter.format(budget as number)
                                  : "---"}
                              </Typography>
                              <Typography
                                variant="h6"
                                sx={{
                                  width: "30%",
                                  display: "flex",
                                  alignItems: "center",
                                }}
                                pl={4}
                              >
                                DAI
                              </Typography>
                            </Stack>
                            <Stack direction="row" pt={1} alignItems="center">
                              <Typography
                                variant="body2"
                                sx={{
                                  width: "30%",
                                }}
                              >
                                Penalization fee
                              </Typography>
                              <Typography variant="h6">
                                {penalizationAmount?.toString() + ".00" ??
                                  "---"}
                              </Typography>
                              <Typography
                                variant="h6"
                                sx={{
                                  width: "30%",
                                  display: "flex",
                                  alignItems: "center",
                                }}
                                pl={4}
                              >
                                DAI
                              </Typography>
                            </Stack>
                            <Stack direction="row" pt={1} alignItems="center">
                              <Typography
                                variant="body2"
                                sx={{
                                  width: "30%",
                                }}
                              >
                                Establishment fee rate
                              </Typography>
                              <Typography variant="h6">
                                {establishmentFeeRate?.toString() + ".00" ??
                                  "---"}
                              </Typography>
                              <Typography
                                variant="h6"
                                sx={{
                                  width: "30%",
                                  display: "flex",
                                  alignItems: "center",
                                }}
                                pl={4}
                              >
                                DAI
                              </Typography>
                            </Stack>
                          </CardContent>
                        </Card>
                      </Stack>
                    </Paper>
                  </Grid>
                </Grid>
              </StepContent>
            </Step>

            <Step key="3" active={isWalletConnected()} completed={false}>
              <StepLabel>
                Create and deploy the Agreement to make it available
              </StepLabel>
              <StepContent>
                <Grid container pt={4} pl={3}>
                  <Grid item xs={8}>
                    <Alert severity="info">
                      <AlertTitle>
                        Please review all details of the Hiring Agreement
                        carefully.
                      </AlertTitle>
                      If all details are correct, you can continue to create the
                      Agreement. The Agreement will then be deployed to Polygon
                      and made available to your service provider.
                    </Alert>
                    <Stack pt={2}>
                      <Button
                        variant="contained"
                        color="primary"
                        size="large"
                        startIcon={<DriveFileRenameOutlineIcon />}
                        fullWidth
                        type="submit"
                      >
                        Create Agreement
                      </Button>
                    </Stack>
                  </Grid>
                  <Grid item xs></Grid>
                </Grid>
              </StepContent>
            </Step>
          </Stepper>
        </Container>
      </form>

      <CreateAgreementStatus
        open={openStatusesDialog}
        onClose={(e) => handleCloseCreateAgreementStatuses(e)}
        isTokenApprovePendingSignature={isTokenApprovePendingSignature}
        isTokenApproveMining={isTokenApproveMining}
        isTokenApproveSuccess={isTokenApproveSuccess}
        isCreateAgreementPendingSignature={isCreateAgreementPendingSignature}
        isCreateAgreementMining={isCreateAgreementMining}
        isCreateAgreementSuccess={isCreateAgreementSuccess}
        isError={isError}
      />

      <Box maxWidth={300}>
        <SnackbarAlert
          open={openSnackbarAlert}
          onClose={() => setOpenSnackbarAlert(false)}
          severity={snackbarAlertSeverity}
          message={
            isError
              ? errorMessage?.split("(")[0]
              : !address
              ? "Connect your wallet first"
              : isCreateAgreementSuccess
              ? "Your Agreement has been created! You can review it on your agreements page."
              : ""
          }
        />
      </Box>

      <Dialog
        open={betaDialogOpen}
        onClose={betaDialogOk}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">
          contractful Hiring Agreement beta note
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            Note: This is a beta implementation of the contractful Hiring
            Agreements deployed to the Polygon Network. If you are interested in
            functionality for the service beyond the beta scope, please visit{" "}
            <Link href="https://github.com/contractful" target="_new">
              https://github.com/contractful
            </Link>{" "}
            to get in touch.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={betaDialogOk} variant="text" autoFocus>
            Ok, thanks for the information
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default CreateHiringAgreement;
