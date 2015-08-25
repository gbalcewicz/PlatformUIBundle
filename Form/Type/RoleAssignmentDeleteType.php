<?php
/**
 * File containing the RoleAssignmentDeleteType class.
 *
 * @copyright Copyright (C) eZ Systems AS. All rights reserved.
 * @license For full copyright and license information view LICENSE file distributed with this source code.
 *
 * @version //autogentag//
 */
namespace EzSystems\PlatformUIBundle\Form\Type;

use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\FormBuilderInterface;
use Symfony\Component\OptionsResolver\OptionsResolver;
use Symfony\Component\Translation\TranslatorInterface;

class RoleAssignmentDeleteType extends AbstractType
{
    /**
     * @var \Symfony\Component\Translation\TranslatorInterface
     */
    private $translator;

    public function __construct(TranslatorInterface $translator)
    {
        $this->translator = $translator;
    }

    public function buildForm(FormBuilderInterface $builder, array $options)
    {
        $submitLabel = $this->translator->trans('role.view.delete_assignment', [], 'role');

        $builder
            ->add('identifier', 'hidden')
            ->add('delete', 'submit', ['label' => $submitLabel]);
    }

    public function getName()
    {
        return 'roleassignmentdelete';
    }

    public function configureOptions(OptionsResolver $resolver)
    {
        $resolver->setDefaults(
            ['data_class' => 'eZ\Publish\API\Repository\Values\User\RoleUpdateStruct']
        );
    }
}
