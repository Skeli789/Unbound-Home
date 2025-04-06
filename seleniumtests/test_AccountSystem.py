import os
import pytest
from unittest import TestCase
from selenium.webdriver.common.by import By

from seleniumtests.ActivationUtil import ActivateAccount
from seleniumtests.LoginUtil import HandleLogin, LogOut
from seleniumtests.SignUpUtil import HandleSignUp, RemoveExistingAccounts
from seleniumtests.TestUtils import *
from seleniumtests.UploadSaveFileUtil import *

USE_UPLOAD_DOWNLOAD = os.getenv("REACT_APP_USE_ORIGINAL_UPLOAD_DOWNLOAD", "false").lower() == "true"


@pytest.mark.incremental
class TestAccountSystem(TestCase):
    @classmethod
    def setUpClass(cls):
        # Instantiate the driver and navigate to the site
        cls.driver = SetUpDriver(BROWSER)
        cls.driver.get(URL_SITE)

    @classmethod
    def tearDownClass(cls):
        # Close the browser after tests are done
        cls.driver.quit()

    def test_1_ConnectToSite(self):
        # Verify we connected successfully
        self.assertIn("Unbound", self.driver.title)

    def test_2_ClickGetStarted(self):
        getStartedButton = WaitForElement(self.driver, By.ID, "get-started-button")
        ClickButton(getStartedButton)

    def test_3_SignUp(self):
        RemoveExistingAccounts()
        HandleSignUp(self.driver, self)

    def test_4_ActivateAccount(self):
        ActivateAccount(self.driver, self)

    def test_5_Login(self):
        LogOut(self.driver)
        HandleLogin(self.driver)

    def test_6_UploadSaveFile(self):
        if BROWSER == "safari":
            # Safari is a pain to automate for file uploads
            self.skipTest("Skipping upload test for Safari due to automation limitations.")

        CopyTestSaveFile()
        if USE_UPLOAD_DOWNLOAD:  # Use the browser's original upload/download functionality
            UploadSaveFile(self.driver)
        else:  # Use the FileSystemHandle API
            if os.name == 'nt':  # Locally on Windows
                ChooseSaveFileWindows(self.driver)
            else:
                ChooseSaveFileLinux(self.driver)
