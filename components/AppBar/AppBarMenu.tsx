import Link from 'next/link';
import {
  IconButton,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  useDisclosure,
} from '@chakra-ui/react';
import { HamburgerIcon } from '@chakra-ui/icons';
import SettingsModal from 'components/Settings/SettingsModal';
import AboutModal from 'components/About/AboutModal';

const AppBarMenu = () => {
  const settings = useDisclosure();
  const about = useDisclosure();

  return (
    <>
      <Menu>
        <MenuButton
          as={IconButton}
          aria-label="menu"
          variant="ghost"
          icon={<HamburgerIcon />}
          _hover={{ bg: 'gray.700' }}
        />
        <MenuList>
          <MenuItem as={Link} href="/">
            Home
          </MenuItem>
          <MenuItem as={Link} href="/depth-charts">
            Depth Charts
          </MenuItem>
          <MenuItem onClick={settings.onOpen}>Settings</MenuItem>
          <MenuItem onClick={about.onOpen}>About</MenuItem>
        </MenuList>
      </Menu>

      <SettingsModal isOpen={settings.isOpen} onClose={settings.onClose} />
      <AboutModal isOpen={about.isOpen} onClose={about.onClose} />
    </>
  );
};

export default AppBarMenu;
